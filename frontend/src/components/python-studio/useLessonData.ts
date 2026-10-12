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

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    setEmpty(false);
    try {
      // Gọi /api/user TRƯỚC, không song song: với người mới, request đầu tiên
      // là request tạo tài khoản khách (apiFetch). Chạy song song thì hai
      // request cùng nhận 401 — vẫn chỉ một khách nhờ dedupe, nhưng tuần tự
      // thì /api/enrolled chắc chắn đi với token đã có.
      const profile = await json('/api/user');
      let enrollment = findEnrollment(asList(await json('/api/enrolled'), 'enrolled'), courseId);
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

      const payload = await json(
        `/api/courses/${encodeURIComponent(courseId)}/lessons/${lessonNo}/content`,
      );
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
  }, [courseId, json, lessonNo, onDraftReady]);

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
    [courseId, json, lessonNo, meta],
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
