'use client';

/*
 * StudyRoom — vỏ React của cảnh "Góc học" (trang chủ `/`).
 *
 * Cảnh là một hệ hoạt ảnh THEO LỐI RA LỆNH: bầu trời chạy theo đồng hồ, mười
 * mấy lớp vật cắt rời, chuyển màn bằng Web Animations, vùng bấm là đa giác SVG
 * vẽ theo viền từng vật. Viết lại nó thành React là tự nhận một mớ lỗi mới
 * không đổi lấy gì, nên React ở đây chỉ làm đúng ba việc:
 *
 *   1. cho engine một phần tử để ở, và một vòng đời sạch (StrictMode mount hai
 *      lần, Fast Refresh mount lại — `dispose()` phải dọn hết timer, vòng khung
 *      hình và listener, xem cuối engine.js);
 *   2. ĐI LẤY SỐ trước khi dựng cảnh, qua `apiFetchSessionOnly`;
 *   3. giữ `localStorage` (tên hiển thị) — engine không tự chạm vào, vì ở chế
 *      độ riêng tư `localStorage` NÉM LỖI chứ không trả null.
 *
 * ── VÌ SAO LÀ `apiFetchSessionOnly`, KHÔNG PHẢI `apiFetch` ──────────────────
 * Trang chủ là trang CÔNG KHAI. `apiFetch` gặp 401 sẽ thử refresh rồi rơi
 * xuống `ensureGuest()`, tức MỖI CON BOT quét web tạo một tài khoản khách:
 * bảng `users` phình, và hạn mức THROTTLE_GUEST_LIMIT (120 lượt/giờ/IP) cháy
 * đúng lúc cả phòng máy chung một NAT cần tài khoản thật. Nên ở đây: chỉ gọi
 * khi máy ĐÃ CÓ phiên (`hasStoredSession`), và chỉ bằng đường chỉ-refresh.
 * Khách vãng lai: 0 lời gọi mạng, và vẫn thấy ĐẦY ĐỦ căn phòng — chỉ các con
 * số là dấu "—". Bẫy này ghi trong AGENTS.md ("apiFetch gặp 401 là TỰ TẠO tài
 * khoản khách").
 *
 * ── VÌ SAO LẤY SỐ TRƯỚC RỒI MỚI DỰNG CẢNH ──────────────────────────────────
 * Vì engine đọc `state` MỘT LẦN lúc init (nó dựng 28 vùng bấm, nhãn, giấy nhớ
 * và màn mở đầu từ đó). Nhồi số vào sau nghĩa là init lại cả cảnh, tức phát lại
 * màn đèn bật — nhìn thấy được và rất khó chịu. Nên: chờ số (có trần thời gian
 * `TRAN_CHO_MS`, backend chết thì không ai phải nhìn màn hình trống), rồi dựng.
 */

import { useEffect, useRef } from 'react';

import { apiFetchSessionOnly, asList, findEnrollment } from '@/lib/api';
import { completedLessonSet, hasStoredSession, LS_ACCESS, LS_LEGACY_REFRESH } from '@/lib/course-progress';
import {
  buildContent,
  EMPTY_USER,
  type LessonMetaRow,
  type ModuleRow,
  type RoomUser,
} from '@/lib/goc-hoc';

import { initStudyRoom } from './engine';
import { SHELL_HTML } from './shell';
import './scene.css';

/** Trần chờ các lượt gọi số. Quá hạn thì dựng cảnh với số đang có. */
const TRAN_CHO_MS = 3000;

/** Tên hiển thị người test tự đặt — xem màn Xếp hạng. Chỉ nằm trong máy họ. */
const LS_TEN = 'pe_goc_hoc_ten';

export type StudyRoomProps = {
  courseId: string;
  courseName: string;
  lessonUrl: string;
  modules: ModuleRow[];
  meta: LessonMetaRow[];
};

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Một lượt gọi "chỉ-phiên": lỗi mạng, 4xx hay JSON rác đều thành `null`. */
async function doc<T>(path: string, lay: (data: unknown) => T | null): Promise<T | null> {
  try {
    const res = await apiFetchSessionOnly(path);
    if (!res.ok) return null;
    return lay((await res.json()) as unknown);
  } catch {
    return null;
  }
}

const soHay = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Kết quả một lượt đi lấy số: các con số để HIỆN, và tập bài đã xong để DỰNG. */
type KetQua = { user: RoomUser; done: number[] };

/**
 * Đi lấy số của người học. Chưa có phiên ⇒ trả về `EMPTY_USER` và KHÔNG gọi gì.
 *
 * Năm đường, năm thứ khác nhau, và mỗi đường hỏng riêng được:
 *  · `/api/enrolled`      → `completedLessonNumbers` (chỉ đường này trả nó —
 *                           `/api/courses-enrolled` KHÔNG có, nên đừng đổi);
 *  · `/api/stats`         → tổng XP;
 *  · `/api/user`          → tên tài khoản;
 *  · `/api/achievements`  → huy hiệu (hiện trả MẢNG RỖNG: chưa dòng mã nào ghi
 *                           vào bảng danh mục thành tựu, mà vẫn HTTP 200 — nên
 *                           màn Thành tựu phải phân biệt "rỗng" với "không đọc
 *                           được", xem `body('achievements')`);
 *  · `/api/leaderboard`   → bảng xếp hạng theo XP.
 */
async function laySo(courseId: string, total: number): Promise<KetQua> {
  const session = {
    access: lsGet(LS_ACCESS),
    legacyRefresh: lsGet(LS_LEGACY_REFRESH),
    cookie: typeof document === 'undefined' ? null : document.cookie,
  };
  if (!hasStoredSession(session)) return { user: EMPTY_USER, done: [] };

  const [done, xp, name, badges, board] = await Promise.all([
    doc<number[]>('/api/enrolled', (data) => {
      const row = findEnrollment(asList(data, 'enrolled'), courseId);
      const raw = row?.completedLessonNumbers;
      return Array.isArray(raw) ? [...completedLessonSet(raw, total)] : null;
    }),
    doc<number>('/api/stats', (data) => soHay((data as { xp?: unknown })?.xp)),
    doc<string>('/api/user', (data) => {
      const n = (data as { name?: unknown })?.name;
      return typeof n === 'string' && n.trim() ? n.trim() : null;
    }),
    doc<RoomUser['badgeList']>('/api/achievements', (data) =>
      asList<Record<string, unknown>>(data, 'achievements').map((a) => ({
        code: typeof a.code === 'string' ? a.code : '',
        name: typeof a.name === 'string' ? a.name : '',
        unlocked: a.unlocked === true,
      })),
    ),
    doc<{ list: RoomUser['board']; me: RoomUser['rank'] }>('/api/leaderboard', (data) => {
      const rows = asList<Record<string, unknown>>(data, 'entries').map((e) => ({
        rank: soHay(e.rank) ?? 0,
        name: typeof e.name === 'string' ? e.name : '',
        value: soHay(e.value) ?? 0,
        isMe: e.is_me === true,
      }));
      const me = rows.find((r) => r.isMe) ?? null;
      return { list: rows, me: me ? { rank: me.rank, value: me.value } : null };
    }),
  ]);

  return {
    user: {
      signedIn: true,
      name,
      xp,
      lessonsDone: done ? done.length : null,
      badges: badges
        ? { done: badges.filter((b) => b.unlocked).length, total: badges.length }
        : null,
      rank: board ? board.me : null,
      badgeList: badges,
      board: board ? board.list : null,
    },
    // Tập bài đã xong đi RIÊNG khỏi `user`: nó không phải một con số để hiện ra
    // mà là nguyên liệu dựng trạng thái của từng cuốn sách trên kệ.
    done: done ?? [],
  };
}

export default function StudyRoom(props: StudyRoomProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let dispose: (() => void) | null = null;
    let huy = false;

    const total = props.modules.reduce((s, m) => s + m.lessons.length, 0);
    const cho = new Promise<KetQua>((res) =>
      setTimeout(() => res({ user: EMPTY_USER, done: [] }), TRAN_CHO_MS),
    );

    void Promise.race([laySo(props.courseId, total), cho]).then(({ user, done }) => {
      // Cleanup đã chạy (StrictMode, hoặc người dùng đi sang trang khác trong
      // lúc chờ): không được dựng cảnh lên một DOM đã bỏ.
      if (huy || !hostRef.current) return;
      const content = buildContent({
        courseId: props.courseId,
        courseName: props.courseName,
        lessonUrl: props.lessonUrl,
        modules: props.modules,
        meta: props.meta,
        completed: new Set(done),
      });
      host.innerHTML = SHELL_HTML;
      dispose = initStudyRoom(host, {
        content,
        user,
        ten: {
          doc: () => lsGet(LS_TEN),
          ghi: (v: string) => {
            try {
              if (v) localStorage.setItem(LS_TEN, v);
              else localStorage.removeItem(LS_TEN);
            } catch {
              /* chế độ riêng tư: không lưu được thì thôi, cảnh vẫn chạy */
            }
          },
        },
      });
    });

    return () => {
      huy = true;
      if (dispose) dispose();
      host.innerHTML = '';
    };
  }, [props.courseId, props.courseName, props.lessonUrl, props.modules, props.meta]);

  return <div ref={hostRef} />;
}
