'use client';

// Mọi thứ phải hỏi backend về MỘT bài học: hồ sơ người học, ghi danh, nội dung
// bài, và hai lệnh ghi (đăng ký khoá, lưu hoàn thành bài).
//
// Tách khỏi StudioLesson.tsx để chỗ nào gọi API nằm gọn một nơi: trước đây
// `load()` vừa gọi bốn endpoint, vừa dựng danh sách màn, vừa nạp lại bản nháp
// từ localStorage. Phần bản nháp giờ ở useLessonDraft.ts; hook này chỉ gọi
// `onDraftReady` ở đúng thời điểm cũ (sau khi có nội dung bài, trước khi tắt cờ
// loading) nên thứ tự người học thấy không đổi.
import { useCallback, useEffect, useState } from 'react';

import { apiFetch, asList, findEnrollment } from '@/lib/api';
import { la403ChuaGhiDanh } from '@/lib/lesson-load';
import { buildScreens, type StudioLesson as Lesson } from '@/lib/studio-lesson';

export type Award = { name?: string | null; description?: string | null; icon?: string | null };
export type LessonUser = { id: number; name: string; xp: number; role?: string };
export type LessonMeta = { title: string; xpReward: number };

export type LessonData = {
  lesson: Lesson | null;
  meta: LessonMeta | null;
  user: LessonUser | null;
  streak: number;
  totalLessons: number;
  enrolled: boolean;
  completed: boolean;
  loading: boolean;
  loadError: string;
  /** Bài có hàng trong DB nhưng chưa có nội dung Studio. */
  empty: boolean;
  /** Đang gọi một lệnh ghi (đăng ký / lưu hoàn thành). */
  busy: boolean;
  message: string;
  setMessage: (text: string) => void;
  xpGained: number | null;
  awards: Award[];
  setAwards: (awards: Award[]) => void;
  reload: () => Promise<void>;
  enroll: () => Promise<void>;
  /** `quizScore` là điểm do TRÌNH DUYỆT chấm — xem AGENTS.md, server tin nó. */
  complete: (quizScore: number) => Promise<void>;
};

export function useLessonData({
  courseId,
  lessonNo,
  onDraftReady,
}: {
  courseId: string;
  lessonNo: number;
  /** Có nội dung bài rồi: đây là lúc nạp lại bản nháp đã lưu trên máy. */
  onDraftReady?: (lesson: Lesson, userId: number, screenCount: number) => void;
}): LessonData {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [meta, setMeta] = useState<LessonMeta | null>(null);
  const [user, setUser] = useState<LessonUser | null>(null);
  const [streak, setStreak] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [empty, setEmpty] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [awards, setAwards] = useState<Award[]>([]);
  const [xpGained, setXpGained] = useState<number | null>(null);

  const json = useCallback(
    async (path: string, options?: RequestInit) => {
      const response = await apiFetch(path, options);
      // Frontend không còn trang đăng nhập (/login đã gỡ) nên không đá đi đâu
      // được nữa — chuyển hướng sẽ ra 404. Báo lỗi tại chỗ để loadError hiện lên.
      if (response.status === 401)
        throw new Error('Bài học này cần phiên đăng nhập hợp lệ từ API.');
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.ok === false)
        throw new Error(
          Array.isArray(body.message)
            ? body.message.join(', ')
            : body.message ||
                // Bộ lọc lỗi của backend gói lỗi thành { error: { status, message } }.
                (typeof body.error === 'object' ? body.error?.message : body.error) ||
                `Không thể kết nối (${response.status}).`,
        );
      return body;
    },
    [],
  );

  /**
   * Như `json`, nhưng 403 trả `null` thay vì ném.
   *
   * Chỉ dùng cho `/content` trong lượt gọi song song: ở đó 403 KHÔNG phải lỗi
   * mà là câu trả lời bình thường cho "người này chưa ghi danh" — backend tự
   * kiểm ghi danh, nên ta hỏi trước rồi ghi danh sau cũng được. Mọi mã lỗi khác
   * vẫn ném như cũ.
   */
  const jsonChoPhep403 = useCallback(
    async (path: string): Promise<Record<string, unknown> | null> => {
      try {
        return (await json(path)) as Record<string, unknown>;
      } catch (e) {
        if (la403ChuaGhiDanh(e)) return null;
        throw e;
      }
    },
    [json],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    setEmpty(false);
    const duongContent = `/api/courses/${encodeURIComponent(courseId)}/lessons/${lessonNo}/content`;
    try {
      // BA lượt gọi SONG SONG, không tuần tự.
      //
      // ĐO TRÊN PRODUCTION (25/10/2026, Resource Timing, API đã nóng): ba lượt
      // nối đuôi nhau — /api/user 1198 ms → /api/enrolled 1286 ms → content
      // 1239 ms — tức **3,7 giây** trước khi chữ đầu tiên của bài hiện ra. Song
      // song thì chỉ còn một lượt, khoảng 1,3 giây.
      //
      // Chú thích cũ ở đây nói phải gọi tuần tự vì "với người mới, request đầu
      // tiên là request tạo tài khoản khách". Đọc lại `apiFetch` thì lý do đó
      // không đứng: gặp 401 nó gọi `refreshAccess()` rồi `ensureGuest()` — CẢ
      // HAI đều dedupe bằng một promise ở tầm module — rồi GỬI LẠI request với
      // token vừa có. Nên ba lượt song song cùng nhận 401 thì cùng chờ đúng một
      // lượt tạo khách, rồi cả ba tự gửi lại. Một tài khoản, không ba.
      //
      // `/content` được phép 403: người chưa ghi danh thì nhánh ghi danh bên
      // dưới lo, và lúc đó mới gọi lại content. Tức người MỚI trả thêm một lượt,
      // người ĐANG HỌC (ca thường) tiết kiệm hai lượt.
      const [profile, enrolledBody, contentDau] = await Promise.all([
        json('/api/user'),
        json('/api/enrolled'),
        jsonChoPhep403(duongContent),
      ]);
      let enrollment = findEnrollment(asList(enrolledBody, 'enrolled'), courseId);
      // Trang khoá học nay là danh mục tĩnh, không còn nút "Đăng ký" — mở bài
      // là tự ghi danh, để người thử vào thẳng nội dung. Ghi danh lặp lại an
      // toàn (backend ON CONFLICT DO NOTHING), lỗi thì rơi về màn ghi danh như trước.
      if (!enrollment && profile.role !== 'admin') {
        try {
          await json(`/api/courses/${encodeURIComponent(courseId)}/enroll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });
          enrollment = findEnrollment(asList(await json('/api/enrolled'), 'enrolled'), courseId);
        } catch {
          /* giữ enrollment = null -> hiện màn ghi danh */
        }
      }
      setUser(profile);
      setEnrolled(Boolean(enrollment));
      setTotalLessons(Number(enrollment?.totalLessons) || 0);
      // Streak chỉ để hiện trên thanh trên cùng — hỏng thì bỏ qua, không chặn bài.
      void apiFetch('/api/stats')
        .then((r) => (r.ok ? r.json() : null))
        .then((stats) => setStreak(Number(stats?.streak) || 0))
        .catch(() => undefined);

      // Quản trị viên xem trước bài học mà không cần ghi danh; backend cũng cho
      // đọc content nhưng vẫn chặn nộp bài.
      if (!enrollment && profile.role !== 'admin') {
        setLoading(false);
        return;
      }

      // Lượt song song ở trên đã lấy được content thì dùng luôn; chỉ gọi lại khi
      // nó bị 403 vì lúc đó chưa ghi danh (người mới), và giờ đã ghi danh xong.
      const payload = contentDau ?? (await json(duongContent));
      const content = payload.lesson?.contentJson as Lesson | null;
      setMeta({
        title: payload.lesson?.title || `Bài ${lessonNo}`,
        xpReward: payload.lesson?.xpReward || 0,
      });
      setCompleted(Boolean(payload.completed));

      // A lesson row can exist with no studio content yet (or only the legacy
      // {text} wrapper). Say so plainly instead of rendering an empty shell.
      const list = content ? buildScreens(content) : [];
      if (!content || !list.length) {
        setEmpty(true);
        setLoading(false);
        return;
      }
      setLesson(content);
      onDraftReady?.(content, Number(profile.id), list.length);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Không kết nối được backend.');
    } finally {
      setLoading(false);
    }
  }, [courseId, json, jsonChoPhep403, lessonNo, onDraftReady]);

  useEffect(() => {
    const init = setTimeout(() => void load(), 0);
    return () => clearTimeout(init);
  }, [courseId, lessonNo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.title = meta?.title
      ? `${meta.title} · Python Studio | Programming Edu`
      : 'Python Studio | Programming Edu';
  }, [meta?.title]);

  const enroll = useCallback(async () => {
    setBusy(true);
    try {
      await json(`/api/courses/${encodeURIComponent(courseId)}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }, [courseId, json, load]);

  const complete = useCallback(
    async (quizScore: number) => {
      setBusy(true);
      try {
        const body = await json(`/api/lessons/${lessonNo}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            lessonTitle: meta?.title,
            xpEarned: meta?.xpReward || undefined,
            // Khoá có mini-game gửi điểm thật (tỉ lệ màn đúng ngay lần đầu);
            // backend dùng nó để chia XP trong khung 50–100% xp_reward.
            quizScore,
          }),
        });
        setCompleted(true);
        // Bài cửa: server chỉ trả solutionCode khi bài ĐÃ hoàn thành, mà nội
        // dung chỉ nạp một lần lúc mở bài — trước đây nộp xong phải tải lại
        // trang mới thấy lời giải mẫu (AGENTS.md). Giờ vừa ghi nhận xong thì
        // xin lại nội dung để lấy lời giải; hỏng thì thôi, không chặn bài.
        if (lesson?.step_4?.solutionWithheld) {
          try {
            const fresh = await json(
              `/api/courses/${encodeURIComponent(courseId)}/lessons/${lessonNo}/content`,
            );
            const content = fresh.lesson?.contentJson as Lesson | null;
            if (content?.step_4?.solutionCode) setLesson(content);
          } catch {
            /* giữ nội dung cũ */
          }
        }
        if (typeof body.xpGained === 'number') setXpGained(body.xpGained);
        if (Array.isArray(body.newAchievements) && body.newAchievements.length)
          setAwards(body.newAchievements as Award[]);
        setMessage(
          body.alreadyCompleted
            ? 'Bài này đã hoàn thành trước đó — không cộng XP lần hai.'
            : 'Đã lưu hoàn thành bài học.',
        );
      } catch (error) {
        setMessage(`Chưa lưu được tiến độ: ${(error as Error).message}`);
      } finally {
        setBusy(false);
      }
    },
    [courseId, json, lesson, lessonNo, meta],
  );

  return {
    lesson,
    meta,
    user,
    streak,
    totalLessons,
    enrolled,
    completed,
    loading,
    loadError,
    empty,
    busy,
    message,
    setMessage,
    xpGained,
    awards,
    setAwards,
    reload: load,
    enroll,
    complete,
  };
}
