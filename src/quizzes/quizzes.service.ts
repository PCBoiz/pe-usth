import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { toStudyDate } from 'src/common/streak/streak.service';
import {
  KHOA_SO_NGAY_TRE,
  POST_TEST_KIND,
  khoHauKiemCua,
  mocDuTre,
  mocMoCong,
  soNgayTre,
} from './post-test';

/**
 * `content_json` là JSON TỰ DO (quản trị dán vào, hoặc do scripts/pe-v4 sinh),
 * nên mọi bậc đều phải dò chứ không ép kiểu. Trước đây chỗ này ép thẳng
 * `as Record<string, any>`: `any` chảy từ `collectQuestions()` xuống tận
 * `normalizeQuestion()` và sinh 13 lỗi `no-unsafe-*` — tệ hơn, gõ sai tên field
 * (`o.titel`) vẫn biên dịch được và chỉ lặng lẽ cho ra chuỗi rỗng.
 *
 * Giữ ĐÚNG luật cũ `value && typeof value === 'object'`: mảng cũng được coi là
 * record (rồi `.mcq` ra undefined), chỉ `null` bị loại.
 */
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

const MIN_POOL = 5;
const SAMPLE_MIN = 5;
const SAMPLE_MAX = 10;
const HISTORY_LIMIT = 50;

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number | string;
  explanation?: string;
  /**
   * Bài học sinh ra câu hỏi này. KHÔNG có trong content_json — được gắn thêm
   * lúc gom pool, để quiz ôn tập có trọng số biết câu nào thuộc bài nào.
   * Chỉ backend đọc: `stripAnswers()` không trả field này cho FE.
   */
  lessonId: number;
  /**
   * Khoá chứa bài trên. Cần cho đề ôn HẰNG NGÀY (trộn câu từ nhiều khoá) để
   * biết ghi bản ghi `quizzes` vào khoá nào — cột `course_id` là bắt buộc và
   * có khoá ngoại, không nhận null. Cũng chỉ backend đọc.
   */
  courseId: string;
}

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ---------- Task 122-125 ----------
  async generateQuiz(userId: number, courseId: string) {
    // Hành vi KHÔNG đổi: vẫn random đều. Ba bước (gom pool / chọn câu / lưu +
    // strip) tách thành helper dùng chung với generateReviewQuiz() để hai luồng
    // không lệch nhau khi luật gom pool hay khuôn dữ liệu lưu đổi về sau.
    const pool = await this.buildQuestionPool(userId, courseId);
    // Trọng số đều (1): luồng này cố ý KHÔNG ưu tiên bài hay sai, nhưng vẫn
    // phải trải theo bài — xem pickSpreadByLesson.
    const picked = this.pickSpreadByLesson(
      pool,
      pool.map(() => 1),
      this.sampleSize(pool.length),
    );
    return this.persistQuiz(userId, courseId, picked);
  }

  // ---------- Task 136 ----------
  /**
   * Quiz ôn tập CÓ TRỌNG SỐ: ưu tiên câu thuộc bài học viên hay sai trong khóa
   * này, nhưng bài nào cũng còn cơ hội được chọn (trọng số tối thiểu 1) nên vẫn
   * lẫn một phần câu từ bài đã làm đúng hết.
   *
   * Khác `generateQuiz()` DUY NHẤT ở bước chọn câu — pool, khuôn bản ghi lưu DB
   * và định dạng trả về đều giống hệt, nên submit/getQuiz/history dùng chung.
   */
  async generateReviewQuiz(userId: number, courseId: string) {
    const pool = await this.buildQuestionPool(userId, courseId);

    const history = await this.prisma.reviewQuizResult.findMany({
      where: { userId, quiz: { courseId } },
      select: { answersJson: true },
    });

    const { totalByLesson, wrongByLesson } =
      this.tallyMistakesByLesson(history);

    // weight ∈ [1, 2]: bài chưa từng làm hoặc luôn đúng = 1; bài luôn sai = 2.
    // Không bao giờ bằng 0 nên không bài nào bị loại hẳn khỏi vòng chọn.
    const weights = pool.map((q) => {
      const total = totalByLesson.get(q.lessonId) ?? 0;
      const wrong = wrongByLesson.get(q.lessonId) ?? 0;
      return 1 + (total > 0 ? wrong / total : 0);
    });

    const picked = this.pickSpreadByLesson(
      pool,
      weights,
      this.sampleSize(pool.length),
    );
    return this.persistQuiz(userId, courseId, picked);
  }

  // ---------- Task 138 ----------
  /**
   * Đề ôn HẰNG NGÀY của thẻ "Ôn tập hôm nay" ở Bảng điều khiển.
   *
   * Khác hai method trên ở hai điểm:
   *  · Pool trộn câu từ MỌI khoá học viên đã học, không bó trong một khoá.
   *  · Mỗi ngày học chỉ được một đề — đã nộp hôm nay thì chặn, để nhịp ôn rải
   *    đều thay vì dồn một hôm.
   *
   * Vẫn dùng chung trọng số "hay sai thì hay gặp lại" như generateReviewQuiz().
   */
  async generateDailyReviewQuiz(userId: number) {
    // Chặn theo NGÀY HỌC (múi giờ nghiệp vụ), giống hệt cách tính của thẻ ở
    // Bảng điều khiển, để giao diện và backend không bao giờ nói khác nhau.
    const latest = await this.prisma.reviewQuizResult.findFirst({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
      select: { submittedAt: true },
    });
    if (
      latest &&
      toStudyDate(latest.submittedAt).getTime() === toStudyDate().getTime()
    ) {
      throw new BadRequestException(
        'Hôm nay bạn đã ôn tập rồi, quay lại vào ngày mai nhé',
      );
    }

    const pool = await this.buildAllCoursesPool(userId);

    // Lịch sử TOÀN BỘ (không lọc theo khoá) vì đề này cũng trộn mọi khoá.
    const history = await this.prisma.reviewQuizResult.findMany({
      where: { userId },
      select: { answersJson: true },
    });
    const { totalByLesson, wrongByLesson } =
      this.tallyMistakesByLesson(history);

    const weights = pool.map((q) => {
      const total = totalByLesson.get(q.lessonId) ?? 0;
      const wrong = wrongByLesson.get(q.lessonId) ?? 0;
      return 1 + (total > 0 ? wrong / total : 0);
    });

    const picked = this.pickSpreadByLesson(
      pool,
      weights,
      this.sampleSize(pool.length),
    );

    // Cột `quizzes.course_id` là NOT NULL kèm khoá ngoại nên đề trộn nhiều khoá
    // vẫn phải chọn một khoá để ghi. Lấy khoá đóng góp nhiều câu nhất — đó cũng
    // là khoá đề này nói về nhiều nhất, nên lịch sử theo khoá vẫn đọc được.
    return this.persistQuiz(userId, this.dominantCourseId(picked), picked);
  }

  // ---------- Task 139 ----------
  /**
   * Bộ đếm "hôm nay bạn đã học gì": liệt kê các bài HOÀN THÀNH TRONG NGÀY HỌC
   * hôm nay, kèm số câu hỏi rút được từ đúng những bài đó.
   *
   * `questions_available` cho giao diện biết TRƯỚC là có ôn được không, thay vì
   * để người dùng bấm nút rồi mới nhận lỗi "chưa đủ câu hỏi" — đúng cái màn hình
   * cụt hiện tại.
   */
  async getTodayLessons(userId: number) {
    const rows = await this.todayProgressRows(userId);

    if (rows.length === 0) {
      return {
        ok: true,
        count: 0,
        questions_available: 0,
        min_questions: MIN_POOL,
        can_quiz: false,
        lessons: [],
      };
    }

    const lessons = await this.prisma.lesson.findMany({
      where: { id: { in: rows.map((r) => r.lessonId) } },
      select: {
        id: true,
        courseId: true,
        title: true,
        module: true,
        contentJson: true,
        course: { select: { title: true } },
      },
    });

    const pool = this.collectQuestions(lessons);
    const byLesson = new Map<number, number>();
    for (const q of pool) {
      byLesson.set(q.lessonId, (byLesson.get(q.lessonId) ?? 0) + 1);
    }

    // Giữ thứ tự học trong ngày: bài xong sau đứng trước cho dễ nhớ.
    const doneAt = new Map(rows.map((r) => [r.lessonId, r.completedAt]));
    const list = lessons
      .map((l) => ({
        id: l.id,
        title: l.title ?? l.module ?? `Bài ${l.id}`,
        course_id: l.courseId,
        course_title: l.course?.title ?? l.courseId,
        completed_at: doneAt.get(l.id) ?? null,
        question_count: byLesson.get(l.id) ?? 0,
      }))
      .sort(
        (a, b) =>
          (b.completed_at?.getTime() ?? 0) - (a.completed_at?.getTime() ?? 0),
      );

    return {
      ok: true,
      count: list.length,
      questions_available: pool.length,
      min_questions: MIN_POOL,
      can_quiz: pool.length >= MIN_POOL,
      lessons: list,
    };
  }

  // ---------- Task 140 ----------
  /**
   * Đề tổng hợp từ ĐÚNG những bài đã học trong ngày hôm nay.
   *
   * Khác `generateDailyReviewQuiz()`: bên kia trộn mọi bài từng học và chỉ cho
   * một đề mỗi ngày (ôn dàn trải); bên này bó gọn vào bài vừa học xong hôm nay
   * và KHÔNG giới hạn số lần — nó là công cụ củng cố ngay sau buổi học, làm lại
   * nhiều lần là có ích chứ không phải gian lận.
   */
  async generateTodayQuiz(userId: number) {
    const rows = await this.todayProgressRows(userId);
    if (rows.length === 0) {
      throw new BadRequestException(
        'Hôm nay bạn chưa hoàn thành bài học nào để ôn',
      );
    }

    const lessons = await this.prisma.lesson.findMany({
      where: { id: { in: rows.map((r) => r.lessonId) } },
      select: { id: true, courseId: true, contentJson: true },
    });

    const pool = this.collectQuestions(lessons);
    if (pool.length < MIN_POOL) {
      throw new BadRequestException(
        'Các bài học hôm nay chưa đủ câu hỏi để tạo đề, học thêm một bài nữa nhé',
      );
    }

    // Trọng số đều (1): luồng này cố ý KHÔNG ưu tiên bài hay sai, nhưng vẫn
    // phải trải theo bài — xem pickSpreadByLesson.
    const picked = this.pickSpreadByLesson(
      pool,
      pool.map(() => 1),
      this.sampleSize(pool.length),
    );
    return this.persistQuiz(userId, this.dominantCourseId(picked), picked);
  }

  // ---------- Task 126-128 ----------
  async submitQuiz(userId: number, quizId: number, answers: unknown[]) {
    // `select` tường minh, KHÔNG phải SELECT * — và lý do là một tai nạn deploy
    // đang chờ xảy ra, không phải chuyện gọn gàng. `docs/deploy-runbook.md` cố
    // ý KHÔNG đưa `prisma migrate deploy` vào Build Command, nên code lên
    // production TRƯỚC migration. Cột `kind` mới thêm (migration
    // 20261028010000) mà SELECT * đòi nó thì mọi lần NỘP BÀI trả 500 cho tới
    // khi ai đó chạy migration bằng tay — tức làm vỡ đúng con đường chấm điểm
    // duy nhất mà client không giả mạo được. Liệt kê cột thì cửa sổ đó chỉ còn
    // ảnh hưởng hai route hậu kiểm (chưa có giao diện nào gọi).
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      select: { userId: true, status: true, questionsJson: true },
    });
    if (!quiz) throw new NotFoundException('Không tìm thấy quiz');

    // Bước 1: chỉ chủ sở hữu, và chỉ nộp được 1 lần.
    if (quiz.userId !== userId) {
      throw new ForbiddenException('Không có quyền truy cập quiz này');
    }
    if (quiz.status === 'submitted') {
      throw new ConflictException('Quiz này đã được nộp');
    }

    // Bước 2: chấm điểm theo SNAPSHOT trong DB, KHÔNG tin dữ liệu client gửi.
    const questions = quiz.questionsJson as unknown as QuizQuestion[];
    let score = 0;
    const detail = questions.map((q, i) => {
      const given = answers?.[i];
      const correct = this.isCorrect(q.correct, given);
      if (correct) score += 1;
      return {
        question: q.question,
        given: given ?? null,
        correct: q.correct,
        is_correct: correct,
        explanation: q.explanation ?? null,
        // Chỉ đi vào answersJson lưu DB — nguồn để generateReviewQuiz() đếm
        // số câu sai theo từng bài. Không phải đáp án nên không vi phạm
        // nguyên tắc "không lộ correct/explanation" mà spec đang assert.
        lesson_id: q.lessonId,
      };
    });

    // Bước 3: lưu kết quả + đổi trạng thái trong CÙNG transaction.
    // Kiểm tra `status === 'submitted'` ở Bước 1 chỉ là chặn nhanh — hai
    // request song song (bấm đúp) đều đọc ra 'generated' rồi CẢ HAI cùng ghi
    // kết quả. Dùng compare-and-set như completeLesson: chỉ request đổi được
    // trạng thái generated -> submitted mới được ghi, request thua rollback.
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.quiz.updateMany({
        where: { id: quizId, status: 'generated' },
        data: { status: 'submitted' },
      });
      if (claimed.count === 0) {
        throw new ConflictException('Quiz này đã được nộp');
      }
      await tx.reviewQuizResult.create({
        data: {
          quizId,
          userId,
          score,
          total: questions.length,
          answersJson: detail,
        },
      });
    });

    return { ok: true, score, total: questions.length, detail };
  }

  // ---------- Task 129 ----------
  async getQuiz(userId: number, quizId: number) {
    // `select` tường minh — cùng lý do như `submitQuiz` ở trên.
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        userId: true,
        status: true,
        questionsJson: true,
      },
    });
    // 404 (không phải 403) cho quiz của người khác — không tiết lộ quiz đó tồn tại.
    if (!quiz || quiz.userId !== userId) {
      throw new NotFoundException('Không tìm thấy quiz');
    }

    const questions = quiz.questionsJson as unknown as QuizQuestion[];

    if (quiz.status !== 'submitted') {
      // CHƯA nộp -> vẫn phải giấu đáp án.
      return {
        ok: true,
        quiz_id: quiz.id,
        status: quiz.status,
        questions: this.stripAnswers(questions),
      };
    }

    const result = await this.prisma.reviewQuizResult.findFirst({
      where: { quizId, userId },
      orderBy: { submittedAt: 'desc' },
    });

    return {
      ok: true,
      quiz_id: quiz.id,
      status: quiz.status,
      score: result?.score ?? 0,
      total: result?.total ?? questions.length,
      detail: result?.answersJson ?? [],
    };
  }

  // ---------- Task 130 ----------
  async getQuizHistory(userId: number, courseId: string) {
    const rows = await this.prisma.reviewQuizResult.findMany({
      where: { userId, quiz: { courseId } },
      orderBy: { submittedAt: 'desc' },
      take: HISTORY_LIMIT,
      select: {
        id: true,
        quizId: true,
        score: true,
        total: true,
        submittedAt: true,
      },
    });
    return { ok: true, history: rows };
  }

  // ---------- Bài hậu kiểm CÓ TRỄ ----------
  /**
   * Trạng thái cổng hậu kiểm. Đây là chỗ SERVER nói "đã đến lúc", không phải
   * chỗ người học tự quyết — và đó là điểm thiết kế, không phải tiện tay.
   *
   * Nghiên cứu về quiz ôn TỰ CHỌN cho một kết quả khó chịu, và nó có số:
   * Fellman, Lincke & Jonsson 2020 (N = 105) thấy khả năng suy luận dự báo
   * việc dùng quiz ôn tự chọn (β = 0,67, p = 0,011) — tức đúng những người cần
   * nó nhất là người bỏ qua nó; ở một nơi khác chỉ 12% hoàn thành phần ôn tự
   * chọn; và một nghiên cứu MOOC thấy lợi ích của giãn cách LỚN NHẤT ở nhóm
   * yếu và nhóm ít hoàn thành hoạt động. Tự chọn phân phối lợi ích NGƯỢC.
   * Vì vậy luồng hậu kiểm không được là một nút nằm trong trang "ôn tập" chờ
   * ai tò mò bấm vào; nó phải là một việc được GIAO khi tới hạn. Route này là
   * nguồn duy nhất của quyết định đó, để giao diện không tự nghĩ ra lịch riêng.
   *
   * CHỖ CHƯA BIẾT, giữ nguyên hình dạng chứ đừng lấp: KHÔNG nghiên cứu nào
   * tách riêng được việc BẮT làm có giữ được hiệu ứng hay không. Lập luận ở
   * trên nói rằng tự chọn phân phối sai, nó KHÔNG nói rằng bắt buộc thì hiệu
   * ứng còn nguyên.
   *
   * KHÔNG trả câu hỏi nào, kể cả đề bài — chỉ trả trạng thái.
   */
  async getPostTestStatus(userId: number, courseId: string) {
    const kq = await this.khaoSatHauKiem(userId, courseId);

    if (kq.daPhat) {
      // Đã phát rồi: trả điểm nếu đã nộp, để giao diện khỏi mời làm lần nữa.
      const ketQua =
        kq.daPhat.status === 'submitted'
          ? await this.prisma.reviewQuizResult.findFirst({
              where: { quizId: kq.daPhat.id, userId },
              orderBy: { submittedAt: 'desc' },
              select: { score: true, total: true, submittedAt: true },
            })
          : null;
      return {
        ok: true,
        state: kq.daPhat.status === 'submitted' ? 'done' : 'issued',
        delay_days: kq.soNgay,
        quiz_id: kq.daPhat.id,
        score: ketQua?.score ?? null,
        total: ketQua?.total ?? null,
        submitted_at: ketQua?.submittedAt ?? null,
      };
    }

    const dayDu = kq.pool.length >= MIN_POOL;
    return {
      ok: true,
      // 'none' = chưa học bài nào; 'waiting' = đã học nhưng chưa đủ trễ hoặc
      // chưa đủ câu; 'ready' = server đang GIAO bài này.
      state: kq.tongChin === 0 ? 'none' : dayDu ? 'ready' : 'waiting',
      delay_days: kq.soNgay,
      lessons_completed: kq.tongChin,
      lessons_eligible: kq.soBaiDuTre,
      questions_available: kq.pool.length,
      min_questions: MIN_POOL,
      unlocks_at: kq.moCong,
      quiz_id: null,
    };
  }

  /**
   * Phát đề hậu kiểm. MỘT LẦN cho mỗi (học viên, khoá).
   *
   * Dùng lại NGUYÊN cơ chế đang có — `pickSpreadByLesson` để bốc, `persistQuiz`
   * để lưu snapshot kèm đáp án rồi strip trước khi trả, `submitQuiz` để chấm ở
   * server và chặn lần nộp thứ hai. Thứ duy nhất mới là nguồn câu hỏi (kho ở
   * phía server) và hai cái cổng: TRỄ và MỘT LẦN.
   *
   * ĐIỂM CỦA ĐỀ NÀY LÀ CHỈ SỐ NỘI BỘ CỦA KHOÁ, KHÔNG PHẢI MỘT MỨC NĂNG LỰC.
   * Đọc trước khi ai đó báo nó ra ngoài như một thang đo:
   *  · ba biến thể của một bài đều sinh từ MỘT gốc câu hỏi, nên một đề 15 câu
   *    lấy từ 5 bài là 5 CHÙM 3 CÂU — 5 đơn vị thông tin độc lập, không phải
   *    15. Đó là lý do thứ hai (sau "đề trông lặp") để `pickSpreadByLesson`
   *    trải theo BÀI; và là lý do một Cronbach's alpha đẹp ở đây KHÔNG chứng
   *    minh gì — bản dịch SCS1 tiếng Brazil đã gặp đúng chuyện đó (alpha cao,
   *    tương quan với điểm thật thì thấp).
   *  · độ khó từng câu chưa bao giờ được kiểm bằng dữ liệu thực địa, và ở
   *    n ≤ 40 thì sai số của tỉ lệ đúng một câu là khoảng ±15 điểm phần trăm.
   * Nên con số dùng được là "cùng một người, trước so với sau, trong cùng khoá
   * này", và phải báo kèm MẪU SỐ (11/34, không bao giờ 32%).
   */
  async generatePostTest(userId: number, courseId: string) {
    const kq = await this.khaoSatHauKiem(userId, courseId);

    if (kq.daPhat) {
      throw new ConflictException(
        'Bạn đã nhận bài hậu kiểm của khoá này rồi — mỗi khoá chỉ có một lần',
      );
    }
    if (kq.tongChin === 0) {
      throw new BadRequestException(
        'Bạn cần hoàn thành ít nhất một bài học trước khi làm bài hậu kiểm',
      );
    }
    if (kq.soBaiDuTre === 0) {
      throw new BadRequestException(
        `Bài hậu kiểm chỉ hỏi về bài đã học từ ${kq.soNgay} ngày trước, ` +
          'hãy quay lại sau',
      );
    }
    if (kq.pool.length < MIN_POOL) {
      throw new BadRequestException(
        'Chưa đủ câu hỏi cho bài hậu kiểm, hãy hoàn thành thêm bài học',
      );
    }

    // Trọng số đều (1): bài hậu kiểm là phép ĐO, nên không được ưu tiên bài
    // hay sai như `generateReviewQuiz` — làm vậy là tự chọn mẫu lệch về phần
    // người học kém nhất rồi báo con số đó như là của cả khoá.
    const picked = this.pickSpreadByLesson(
      kq.pool,
      kq.pool.map(() => 1),
      this.sampleSize(kq.pool.length),
    );

    try {
      return await this.persistQuiz(userId, courseId, picked, POST_TEST_KIND);
    } catch (e) {
      // Bấm đúp: hai request đều đọc ra `daPhat === null` rồi cả hai cùng
      // INSERT. Unique index một-phần `uq_quizzes_one_post_test` (xem
      // migration) mới là thứ chặn thật, giống hệt cách `resolveLesson` bắt
      // P2002 sau khi có `uq_lessons_course_sort`.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Bạn đã nhận bài hậu kiểm của khoá này rồi — mỗi khoá chỉ có một lần',
        );
      }
      throw e;
    }
  }

  /**
   * Hai cổng của bài hậu kiểm, đo trong HAI truy vấn (+1 khi có bài đủ trễ).
   *
   * Lấy TOÀN BỘ bản ghi hoàn thành của khoá rồi lọc mốc trễ trong JS, thay vì
   * thêm `completedAt: { lte: moc }` vào WHERE: cần cả "đã học mấy bài" (để
   * phân biệt 'none' với 'waiting') lẫn "bài sớm nhất xong lúc nào" (để nói
   * được cổng mở ngày nào), mà lọc ở SQL thì phải đi thêm một vòng nữa cho
   * từng con số. Một khoá có 172 bài nên đây là tối đa 172 dòng hai cột.
   */
  private async khaoSatHauKiem(userId: number, courseId: string) {
    const soNgay = soNgayTre(this.config.get<number>(KHOA_SO_NGAY_TRE));
    const moc = mocDuTre(soNgay);

    // SONG SONG: hai truy vấn không phụ thuộc nhau, và route này nằm trên
    // đường mở trang khoá học.
    const [daPhat, tienDo] = await Promise.all([
      this.prisma.quiz.findFirst({
        where: { userId, courseId, kind: POST_TEST_KIND },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true },
      }),
      this.prisma.lessonProgress.findMany({
        where: { userId, courseId, status: 'completed' },
        select: { lessonId: true, completedAt: true },
      }),
    ]);

    const duTre = tienDo.filter((r) => r.completedAt <= moc);
    let somNhat: Date | null = null;
    for (const r of tienDo) {
      if (somNhat === null || r.completedAt < somNhat) somNhat = r.completedAt;
    }

    let pool: QuizQuestion[] = [];
    if (duTre.length > 0 && !daPhat) {
      const lessons = await this.prisma.lesson.findMany({
        where: { id: { in: duTre.map((r) => r.lessonId) }, courseId },
        // `lessonCode` là khoá nối sang kho hậu kiểm; `id`/`courseId` để gắn
        // nhãn cho từng câu (xem QuizQuestion).
        select: { id: true, courseId: true, lessonCode: true },
      });
      pool = this.gomCauHauKiem(lessons);
    }

    return {
      soNgay,
      daPhat,
      tongChin: tienDo.length,
      soBaiDuTre: duTre.length,
      moCong: somNhat ? mocMoCong(somNhat, soNgay) : null,
      pool,
    };
  }

  /**
   * Pool hậu kiểm: tra kho theo `lessons.lesson_code`, rồi qua ĐÚNG
   * `normalizeQuestion` mà kho quiz trong bài đang dùng.
   *
   * Vì sao không gọi lại `collectQuestions`: bên đó đọc `contentJson.step_2`,
   * tức đọc 516 câu người học ĐÃ THẤY — đúng thứ bài hậu kiểm phải tránh. Chỉ
   * nguồn câu hỏi khác, phép chuẩn hoá thì dùng chung, nên một lần sửa
   * `normalizeQuestion` áp cho cả hai.
   */
  private gomCauHauKiem(
    lessons: Array<{
      id: number;
      courseId: string;
      lessonCode: string | null;
    }>,
  ): QuizQuestion[] {
    const kho = khoHauKiemCua(
      lessons.length > 0 ? lessons[0].courseId : '__khong_co__',
    );
    const pool: QuizQuestion[] = [];

    for (const lesson of lessons) {
      // `lesson_code` NULL là bản ghi do `resolveLesson()` tự tạo lúc người học
      // hoàn thành một bài chưa có trong DB — không tra được kho, bỏ qua.
      if (!lesson.lessonCode) continue;
      const cau = kho.get(lesson.lessonCode);
      if (!cau) continue;

      for (const raw of cau) {
        const q = this.normalizeQuestion(raw);
        if (q) {
          pool.push({ ...q, lessonId: lesson.id, courseId: lesson.courseId });
        }
      }
    }
    return pool;
  }

  // ---------- helpers ----------

  /**
   * Pool câu hỏi lấy từ các bài ĐÃ hoàn thành trong khóa (kèm lessonId).
   * Dùng chung cho cả quiz random lẫn quiz ôn tập có trọng số — giữ nguyên hai
   * thông báo lỗi tiếng Việt vốn có để FE không phải đổi gì.
   */
  private async buildQuestionPool(
    userId: number,
    courseId: string,
  ): Promise<QuizQuestion[]> {
    // Bước 1: chỉ lấy bài ĐÃ hoàn thành và có nội dung step_2.
    const done = await this.prisma.lessonProgress.findMany({
      where: { userId, courseId, status: 'completed' },
      select: { lessonId: true },
    });
    if (done.length === 0) {
      throw new BadRequestException(
        'Bạn cần hoàn thành ít nhất một bài học trước khi làm quiz',
      );
    }

    const lessons = await this.prisma.lesson.findMany({
      where: { id: { in: done.map((d) => d.lessonId) }, courseId },
      // `id`/`courseId` cần để gắn nhãn cho từng câu hỏi (xem QuizQuestion).
      select: { id: true, courseId: true, contentJson: true },
    });

    // Bước 2: gom pool câu hỏi, hỗ trợ 2 dạng cấu trúc.
    const pool = this.collectQuestions(lessons);
    if (pool.length < MIN_POOL) {
      throw new BadRequestException(
        'Chưa đủ câu hỏi để tạo quiz, hãy hoàn thành thêm bài học',
      );
    }
    return pool;
  }

  /**
   * Pool trộn câu từ MỌI khoá học viên đã học — dùng cho đề ôn hằng ngày.
   * Cùng luật gom câu với `buildQuestionPool()`, chỉ bỏ điều kiện lọc theo khoá.
   */
  private async buildAllCoursesPool(userId: number): Promise<QuizQuestion[]> {
    const done = await this.prisma.lessonProgress.findMany({
      where: { userId, status: 'completed' },
      select: { lessonId: true },
    });
    if (done.length === 0) {
      throw new BadRequestException(
        'Bạn cần hoàn thành ít nhất một bài học trước khi làm quiz',
      );
    }

    const lessons = await this.prisma.lesson.findMany({
      where: { id: { in: done.map((d) => d.lessonId) } },
      select: { id: true, courseId: true, contentJson: true },
    });

    const pool = this.collectQuestions(lessons);
    if (pool.length < MIN_POOL) {
      throw new BadRequestException(
        'Chưa đủ câu hỏi để tạo quiz, hãy hoàn thành thêm bài học',
      );
    }
    return pool;
  }

  /**
   * Các bản ghi tiến độ hoàn thành TRONG NGÀY HỌC hôm nay.
   *
   * Lọc thô 48 giờ ở SQL rồi so ngày trong JS bằng `toStudyDate()` — cùng hàm
   * mà logic chuỗi ngày và cờ "đã ôn hôm nay" đang dùng. Làm vậy để khỏi tự
   * tính mốc nửa đêm theo múi giờ (dễ lệch một tiếng khi đổi giờ), mà "hôm nay"
   * ở mọi chỗ trong hệ thống vẫn là cùng một định nghĩa.
   */
  private async todayProgressRows(userId: number) {
    const rows = await this.prisma.lessonProgress.findMany({
      where: {
        userId,
        status: 'completed',
        completedAt: { gte: new Date(Date.now() - 48 * 3_600_000) },
      },
      select: { lessonId: true, completedAt: true },
    });

    const today = toStudyDate().getTime();
    return rows.filter((r) => toStudyDate(r.completedAt).getTime() === today);
  }

  /** Khoá đóng góp nhiều câu nhất trong đề (hoà thì lấy khoá gặp trước). */
  private dominantCourseId(picked: QuizQuestion[]): string {
    const count = new Map<string, number>();
    for (const q of picked) {
      count.set(q.courseId, (count.get(q.courseId) ?? 0) + 1);
    }
    let best = picked[0].courseId;
    let bestN = 0;
    for (const [id, n] of count) {
      if (n > bestN) {
        best = id;
        bestN = n;
      }
    }
    return best;
  }

  /** Số câu mỗi đề — kẹp trong [SAMPLE_MIN, SAMPLE_MAX] theo cỡ pool. */
  private sampleSize(poolLength: number): number {
    return Math.min(
      SAMPLE_MAX,
      Math.max(SAMPLE_MIN, Math.min(poolLength, SAMPLE_MAX)),
    );
  }

  /**
   * Lưu SNAPSHOT (kèm đáp án) vào DB rồi trả về bản ĐÃ STRIP cho FE.
   * Bảng `quizzes` không phân biệt đề random hay đề có trọng số.
   */
  private async persistQuiz(
    userId: number,
    courseId: string,
    picked: QuizQuestion[],
    /**
     * Nhãn loại đề. `undefined` cho mọi đề ôn tập — Prisma bỏ qua field
     * undefined, nên cột `kind` giữ NULL đúng như mọi bản ghi có trước cột đó.
     * Chỉ bài hậu kiểm truyền `POST_TEST_KIND`, và nhãn ấy là chỗ DUY NHẤT trả
     * lời được "học viên này đã nhận đề hậu kiểm chưa".
     */
    kind?: string,
  ) {
    const quiz = await this.prisma.quiz.create({
      data: {
        userId,
        courseId,
        status: 'generated',
        kind,
        questionsJson: picked as unknown as Prisma.InputJsonValue,
      },
    });

    // STRIP đáp án trước khi trả FE (Sheet 3: lộ đáp án = gian lận điểm).
    return {
      ok: true,
      quiz_id: quiz.id,
      questions: this.stripAnswers(picked),
    };
  }

  /**
   * Đếm số câu đã làm và số câu sai theo từng bài, từ `answersJson` của các
   * lần nộp trước. Bản ghi cũ (trước khi có `lesson_id`) bị bỏ qua thay vì
   * tính nhầm vào bài nào đó.
   */
  private tallyMistakesByLesson(
    history: Array<{ answersJson: Prisma.JsonValue }>,
  ) {
    const totalByLesson = new Map<number, number>();
    const wrongByLesson = new Map<number, number>();

    for (const row of history) {
      const detail = row.answersJson;
      if (!Array.isArray(detail)) continue;

      for (const raw of detail) {
        const item = raw as { lesson_id?: unknown; is_correct?: unknown };
        if (typeof item?.lesson_id !== 'number') continue;

        const id = item.lesson_id;
        totalByLesson.set(id, (totalByLesson.get(id) ?? 0) + 1);
        if (item.is_correct === false) {
          wrongByLesson.set(id, (wrongByLesson.get(id) ?? 0) + 1);
        }
      }
    }
    return { totalByLesson, wrongByLesson };
  }

  /**
   * Bốc `n` câu, ƯU TIÊN mỗi bài một câu.
   *
   * VÌ SAO CẦN, và vì sao nó là luật về BÀI chứ không về câu: từ 27/10/2026 kho
   * câu hỏi là 516 câu của khoá 172 bài, nhưng mỗi bài chỉ có MỘT gốc câu hỏi —
   * 3 câu của một bài là 3 BIẾN THỂ cùng gốc, khác số liệu và khác tình huống
   * chứ không khác điều được hỏi. `weightedSampleWithoutReplacement` bốc đều
   * trên cả pool, nên học viên xong 2 bài nhận đề 5 câu rất dễ gặp 3 câu hỏi
   * cùng một chuyện. Người học đọc ra điều đó là "đề bị lặp", không phải "mình
   * cần ôn thêm".
   *
   * ƯU TIÊN, không phải BẮT BUỘC — và đây là phần quan trọng. Siết thành luật
   * cứng thì đề 5 câu cần 5 bài đã hoàn thành, trong khi `MIN_POOL` chỉ hứa 5
   * CÂU (tức 2 bài). Hứa một đằng chặn một nẻo là làm người học xong 2 bài bấm
   * vào quiz rồi nhận lỗi. Nên: vòng một mỗi bài đúng một câu, thiếu thì vòng
   * hai lấy tiếp từ phần còn lại.
   *
   * Trọng số của vòng hai lấy lại từ `weights` gốc, không tính lại: nó phản ánh
   * tỉ lệ sai theo BÀI (xem tallyMistakesByLesson) nên không phụ thuộc vòng nào.
   */
  private pickSpreadByLesson(
    pool: QuizQuestion[],
    weights: number[],
    n: number,
  ): QuizQuestion[] {
    const chiMuc = pool.map((_, i) => i);
    const daCoBai = new Set<number>();
    const vongMot: number[] = [];
    const conLai: number[] = [];
    // Bốc có trọng số TRÊN CHỈ MỤC để vòng hai còn tra lại được weights.
    for (const i of this.weightedSampleWithoutReplacement(
      chiMuc,
      weights,
      chiMuc.length,
    )) {
      if (daCoBai.has(pool[i].lessonId)) conLai.push(i);
      else {
        daCoBai.add(pool[i].lessonId);
        vongMot.push(i);
      }
    }
    return [...vongMot, ...conLai].slice(0, n).map((i) => pool[i]);
  }

  /**
   * Bốc `n` phần tử KHÔNG lặp lại, xác suất tỉ lệ với trọng số: mỗi vòng cộng
   * dồn trọng số rồi bắn một số ngẫu nhiên vào dải đó, chọn được phần tử nào
   * thì loại luôn khỏi vòng sau.
   * Cỡ pool chỉ vài chục câu nên O(n·m) là thoải mái, không cần tối ưu.
   */
  private weightedSampleWithoutReplacement<T>(
    pool: T[],
    weights: number[],
    n: number,
  ): T[] {
    const items = [...pool];
    const w = [...weights];
    const picked: T[] = [];

    while (picked.length < n && items.length > 0) {
      const sum = w.reduce((a, b) => a + b, 0);
      // Trọng số luôn ≥ 1 nên sum > 0; guard chỉ để phòng khi có ai đổi công
      // thức weight về 0 sau này — khi đó rơi về bốc phần tử đầu còn lại.
      let r = sum > 0 ? Math.random() * sum : 0;

      let idx = items.length - 1;
      for (let i = 0; i < items.length; i++) {
        r -= w[i];
        if (r <= 0) {
          idx = i;
          break;
        }
      }

      picked.push(items[idx]);
      items.splice(idx, 1);
      w.splice(idx, 1);
    }
    return picked;
  }

  /**
   * Hỗ trợ 2 dạng: { mcq: [...] } hoặc câu hỏi đơn nằm thẳng trong step_2.
   * Nhận nguyên bản ghi lesson (không chỉ content_json) để gắn `lessonId` cho
   * từng câu — cả hai nhánh đều gắn id của lesson đang duyệt.
   */
  private collectQuestions(
    lessons: Array<{ id: number; courseId: string; contentJson: unknown }>,
  ): QuizQuestion[] {
    const pool: QuizQuestion[] = [];

    for (const lesson of lessons) {
      const step2 = asRecord(asRecord(lesson.contentJson)?.step_2);
      if (!step2) continue;

      const tag = { lessonId: lesson.id, courseId: lesson.courseId };
      const list: unknown[] = Array.isArray(step2.mcq) ? step2.mcq : [step2];
      for (const raw of list) {
        const q = this.normalizeQuestion(raw);
        if (q) pool.push({ ...q, ...tag });
      }
    }
    return pool;
  }

  /**
   * Đưa một câu hỏi trong content_json về dạng chuẩn, hoặc null nếu không dùng
   * được. Hỗ trợ HAI cách viết vì nội dung do quản trị dán vào:
   *
   *  1. Dạng chuẩn — `correct` ở CẤP CÂU HỎI:
   *       { question, options: ['a','b'], correct: 0 }
   *
   *  2. Dạng tác giả hay dùng — mỗi lựa chọn tự mang cờ đúng/sai:
   *       { question, options: [{ id, text, correct: true|false, explanation }] }
   *     Đây chính là dạng của toàn bộ nội dung bài học đang có trong dự án.
   *     Trước đây bộ lọc chỉ nhận dạng 1 nên loại sạch dạng 2 -> pool luôn rỗng.
   *
   * Dạng 2 được QUY ĐỔI về dạng 1: `options` thành mảng chuỗi, `correct` thành
   * VỊ TRÍ của lựa chọn đúng. Việc đổi này còn bịt một lỗ lộ đáp án: nếu giữ
   * nguyên object, `stripAnswers()` sẽ gửi thẳng cờ `correct: true/false` của
   * từng lựa chọn về trình duyệt.
   */
  private normalizeQuestion(
    raw: unknown,
  ): Omit<QuizQuestion, 'lessonId' | 'courseId'> | null {
    const x = asRecord(raw);
    if (!x || typeof x.question !== 'string' || !Array.isArray(x.options)) {
      return null;
    }
    // Sau `Array.isArray`, TS mới biết đây là mảng; phần tử vẫn là JSON tự do.
    const rawOptions: unknown[] = x.options;

    // Lựa chọn LUÔN được quy về chuỗi, bất kể `correct` nằm ở đâu. Object lựa
    // chọn mang theo cờ `correct` và lời giải thích của chính nó, mà
    // `stripAnswers()` chỉ bỏ field ở CẤP CÂU HỎI — giữ nguyên object là gửi
    // thẳng đáp án về trình duyệt. Nội dung PE v3 có CẢ HAI (`correct: 0` ở cấp
    // câu hỏi VÀ cờ `correct` trong từng lựa chọn) nên trước đây rơi vào nhánh
    // dạng 1 và lộ sạch đáp án của 60 câu trắc nghiệm.
    // CHÚ Ý: chỉ đọc `text` và `label`. Lựa chọn của khối "dự đoán" do
    // scripts/pe-v4/build.py sinh ra lại dùng khoá `title` — đưa loại câu đó
    // vào kho quiz mà không thêm `?? o.title` thì MỌI lựa chọn thành chuỗi rỗng
    // và không có lỗi nào được ném ra. Giữ nguyên ở đây vì kho quiz hiện chỉ
    // lấy `step_2.mcq`; đổi thì phải đổi cùng lúc với nguồn câu hỏi.
    const options: string[] = rawOptions.map((o) => {
      const opt = asRecord(o);
      // Dữ liệu thật luôn là chuỗi; object lọt tới đây là nội dung hỏng và
      // `String()` cho '[object Object]' — ĐÚNG hành vi cũ (lựa chọn như vậy
      // không khớp đáp án nào), nên chỉ ép kiểu cho TS chứ không đổi luật.
      const text = (opt ? (opt.text ?? opt.label ?? '') : o) as
        string | number | boolean | null;
      return String(text);
    });

    // Dạng 1 — `correct` đã ở cấp câu hỏi; chỉ cần lọc lại `options`.
    if (x.correct !== undefined) {
      return {
        question: x.question,
        // `correct` đi thẳng từ JSON vào snapshot lưu DB, KHÔNG được kiểm lại ở
        // đây (isCorrect() so bằng String() nên số hay chuỗi đều chấm được).
        correct: x.correct as number | string,
        options,
        // Lời giải thích chỉ đi vào bản lưu DB; `stripAnswers()` không trả nó
        // cho FE, và submitQuiz() mới hiện sau khi đã chấm.
        explanation:
          (x.explanation as string | undefined) ??
          (typeof x.correct === 'number'
            ? (asRecord(rawOptions[x.correct])?.explanation as
                string | undefined)
            : undefined),
      };
    }

    // Dạng 2 — tìm lựa chọn được đánh dấu đúng.
    const idx = rawOptions.findIndex((o) => asRecord(o)?.correct === true);
    if (idx < 0) return null;

    return {
      question: x.question,
      options,
      correct: idx,
      // Giải thích của chính đáp án đúng là thứ đáng hiện sau khi chấm.
      explanation:
        (asRecord(rawOptions[idx])?.explanation as string | undefined) ??
        (x.explanation as string | undefined),
    };
  }

  /** Bỏ 'correct' và 'explanation' — dùng ở MỌI nhánh trả câu hỏi cho FE. */
  private stripAnswers(questions: QuizQuestion[]) {
    return questions.map((q, i) => ({
      index: i,
      question: q.question,
      options: q.options,
    }));
  }

  private isCorrect(expected: number | string, given: unknown): boolean {
    if (given === undefined || given === null) return false;
    // `given` là câu trả lời THÔ từ client nên có thể là bất cứ gì. Cách so
    // vẫn là `String()` như trước — object sẽ ra '[object Object]' và không
    // khớp đáp án nào; ép kiểu ở đây chỉ để nói rằng đó là chủ ý.
    const answer = given as string | number | boolean;
    return (
      String(expected).trim().toLowerCase() ===
      String(answer).trim().toLowerCase()
    );
  }
}
