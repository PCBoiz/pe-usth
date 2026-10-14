/**
 * Câu chữ và các quyết định của TRANG CHỦ — tách ra khỏi `app/page.tsx` để test
 * được bằng `node --test` (xem `frontend/e2e/unit/home-page.test.mjs`).
 *
 * Vì sao phải là file riêng, không nằm trong component:
 *
 *  1. Trang chủ là trang CÔNG KHAI và được render ở server, nên không có cách
 *     nào kiểm nó bằng cách bấm thử: không có trạng thái, không có API. Thứ
 *     duy nhất kiểm được là CÁI NÓ NÓI — và những câu đó là chỗ triết lý sản
 *     phẩm hiện ra (design-system-v2 mục 2: hệ thống là người dẫn đường kiên
 *     nhẫn, luôn giải thích VÌ SAO, luôn chừa lối khác). Một chuỗi đổi đi là
 *     không ai thấy trong diff của tính năng khác, nên nó phải có test.
 *  2. `node --test` KHÔNG phân giải alias `@/…`, nên file này cố ý không import
 *     gì cả. Mọi dữ liệu thật (giáo trình 8 chặng · 48 bài) được TRUYỀN VÀO.
 *
 * Bản thiết kế dẫn ở đây: `design/project/Main.dc.html` (bản đồ thế giới) và
 * `design-system-v2.md`. Ba thứ bản thiết kế chốt mà file này giữ:
 *
 *  · KHÔNG CHUỖI NGÀY. Không có "5/7 ngày", không ngọn lửa. Chỉ số nào hiện ra
 *    cũng phải là loại CHỈ TĂNG, và chỉ hiện khi có dữ liệu thật. Trang chủ
 *    không gọi API nào (xem `app/page.tsx`) nên nó KHÔNG có chỉ số nào cả —
 *    thà không có hơn là bịa.
 *  · KHÔNG KHOÁ GÌ. Mọi chặng, mọi bài đều vào được; câu dẫn nói thẳng điều đó.
 *  · THUẬT NGỮ: khoá · chặng · bài · màn, và trình soạn code gọi là
 *    "Bàn thí nghiệm" (không gọi IDE).
 */

/** Một chặng trong giáo trình (`curricula.json`): `{ title, lessons[] }`. */
export type ModuleLike = { title: string; lessons: string[] };

/** Hình dạng thật của khoá, đếm từ chính giáo trình đang render. */
export type CourseShape = { stageCount: number; lessonCount: number };

/**
 * Đếm chặng và bài TỪ GIÁO TRÌNH, không nhận con số rời.
 *
 * Vì sao: bẫy "hai nguồn danh sách bài" trong AGENTS.md — `catalog.ts` là bản
 * chép tay từ seed, còn danh sách bài thật nằm ở `curricula.json`. Mọi con số
 * hiện trên trang chủ phải đếm từ nguồn mà trang khoá cũng đọc, không thì hai
 * trang nói hai con số.
 */
export function courseShape(modules?: ModuleLike[] | null): CourseShape {
  const list = modules ?? [];
  return {
    stageCount: list.length,
    lessonCount: list.reduce((sum, m) => sum + m.lessons.length, 0),
  };
}

/**
 * "8 chặng · 48 bài". Dùng "chặng"/"bài" theo bảng thuật ngữ — bản cũ của bản
 * đồ ghi "8 cỗ máy · 48 trang", mà "trang" đã có nghĩa khác (trang giấy trong
 * sổ lý thuyết) và "cỗ máy" là tên ẩn dụ của chặng, không phải đơn vị đếm.
 */
export function shapeLine(shape: CourseShape): string {
  return `${shape.stageCount} chặng · ${shape.lessonCount} bài`;
}

/** Dòng nhãn trên tiêu đề: "Advanced Python · 8 chặng · 48 bài". */
export function courseEyebrow(courseLabel: string, shape: CourseShape): string {
  return `${courseLabel} · ${shapeLine(shape)}`;
}

/**
 * Nhãn trên thẻ khoá. KHÔNG có nhãn điểm sao, và sẽ không thêm lại: `catalog.ts`
 * từng có `rating: 4.8` viết cứng, không có đánh giá nào ở sau nó — đã gỡ ở
 * a04c3cf. Hiện số liệu bịa cho người thử là tự bắn vào chân mình.
 */
export function courseTileTags(shape: CourseShape, levelLabel: string): string[] {
  return ['Python 3.12', levelLabel, shapeLine(shape)];
}

/** Hero: nhãn · tiêu đề · câu dẫn. */
export const INTRO = {
  title: 'Khoá học',
  /**
   * Câu dẫn gánh đúng một việc: nói rằng KHÔNG CÓ GÌ BỊ KHOÁ. Bản thiết kế
   * (Main.dc.html) viết "Chặng nào cũng mở được, cứ bắt đầu từ chỗ bạn muốn" —
   * và grep cả frontend lẫn backend không thấy cơ chế khoá chặng nào, nên câu
   * này là sự thật, không phải lời trấn an.
   */
  lead: 'Chặng nào cũng vào được, bài nào cũng vào được — cứ bắt đầu từ chỗ bạn muốn.',
} as const;

/** Nhãn hai cột ở trang chủ. */
export const SECTIONS = {
  course: 'Khoá đang mở',
  tool: 'Công cụ',
  /** Không hứa hẹn gì về chất lượng; chỉ nói chỗ dùng. */
  toolNote: 'Dùng được cả khi không mở bài học',
} as const;

/**
 * Thẻ "Bàn thí nghiệm" (trước đây gọi là "Python IDE").
 *
 * Hai chỗ sửa, cả hai đều vì sự thật:
 *  · TÊN: bảng thuật ngữ chốt "Bàn thí nghiệm"; "IDE" là từ của nhóm làm sản
 *    phẩm, người học không cần biết.
 *  · NƠI CHẠY: câu cũ ghi "chạy code Python ngay trong trình duyệt, xem kết quả
 *    tức thì" — SAI. `/ide` gửi mã tới `POST /api/python/run` và backend chạy
 *    trong container Docker (xem `app/ide/IdeClient.tsx`); chỉ BÀI HỌC mới chạy
 *    Pyodide trong trình duyệt. Hứa sai chỗ chạy thì người học không hiểu vì
 *    sao Bàn thí nghiệm có buổi báo "chưa có bộ chạy" mà bài học vẫn chạy.
 */
export const LAB_TILE = {
  description:
    'Viết Python rồi chạy thử, không cần mở bài nào. Mã được gửi lên máy chủ và '
    + 'chạy trong môi trường cách ly.',
  tags: ['Python 3.12', 'Chạy trên máy chủ'],
} as const;

/**
 * Khối ghi chú trung thực (design-system-v2 mục 1.4) — mở đầu bằng câu in đậm
 * nói CÁI GÌ LÀ THẬT, rồi mới tới hệ quả.
 *
 * Vì sao có trên trang chủ: trang chủ là chỗ duy nhất hai nơi chạy Python đứng
 * cạnh nhau (bài học ↔ Bàn thí nghiệm). Không nói ra thì người học coi chúng là
 * một và đổ lỗi cho mình khi kết quả khác nhau.
 */
export const HONEST_NOTE = {
  title: 'Hai nơi chạy Python, không giống nhau',
  strong: 'Bài học chạy Python ngay trong trình duyệt bạn đang mở.',
  rest:
    ' Bàn thí nghiệm thì gửi mã lên máy chủ. Cùng Python 3.12, nhưng thư viện có '
    + 'sẵn và thời gian chạy có thể khác nhau.',
} as const;

/** Bốn phần của thẻ gợi ý, đúng thứ tự bản thiết kế. */
export type NextStep = {
  /** (1) nhãn: ai đề xuất. */
  label: string;
  /** (2) tiêu đề: mã + tên bài. */
  title: string;
  /** (3) "Vì sao bài này" — lý do lấy từ dữ liệu, không phải lời cổ vũ. */
  why: string;
  /** (4) nút chính. */
  ctaLabel: string;
  ctaHref: string;
  /** Vạch ngăn rồi tới lối ra yên tĩnh. */
  note: string;
  exitLabel: string;
  exitHref: string;
};

/**
 * Thẻ gợi ý bước tiếp của trang chủ.
 *
 * Vì sao gợi ý là BÀI 1 chứ không phải "bài bạn đang học": trang chủ không gọi
 * API nào (nó công khai, và `apiFetch` gặp 401 sẽ TỰ TẠO tài khoản khách — xem
 * bẫy trong AGENTS.md), nên ở đây hệ thống thật sự KHÔNG BIẾT người xem học tới
 * đâu. Thà nói đúng cái mình biết — thứ tự giáo trình — rồi chỉ sang trang khoá,
 * nơi có phiên thì mới nhắc "Tiếp tục ở bài X".
 *
 * Và vì sao vẫn phải có "Vì sao" + lối ra: thẻ gợi ý thiếu hai phần đó biến
 * thành một cái lệnh. Bản thiết kế bắt lỗi này ở chính màn Main (Main thiếu
 * "Vì sao" và thiếu lựa chọn khác).
 */
export function nextStep(input: {
  courseId: string;
  lessonUrl: string;
  /** Tên chặng đầu, ví dụ "M1 · Tiến trình và subprocess". */
  firstStage?: string;
  /** Tên bài đầu, ví dụ "P01 · Program, process và tài nguyên". */
  firstLesson?: string;
}): NextStep {
  const stage = input.firstStage?.trim();
  const lesson = input.firstLesson?.trim();
  return {
    label: 'Gợi ý bước tiếp · hệ thống chọn',
    title: lesson || 'Bài 1',
    why: stage
      ? `Đây là bài mở đầu chặng ${stage}, nó không đòi bài nào trước đó. `
        + 'Nếu bạn đã học dở, trang khoá sẽ nhắc bạn đang ở bài nào.'
      : 'Đây là bài mở đầu của khoá, nó không đòi bài nào trước đó. '
        + 'Nếu bạn đã học dở, trang khoá sẽ nhắc bạn đang ở bài nào.',
    ctaLabel: 'Mở bài 1',
    // `?lesson=` đếm từ 0 (xem lesson/python_advanced/page.tsx).
    ctaHref: `${input.lessonUrl}?lesson=0`,
    note: 'Đây là gợi ý, không phải lệnh.',
    exitLabel: 'Tự chọn bài',
    /**
     * Neo `#cd-curriculum` là danh sách 48 bài ở trang khoá. Hash sai thì cùng
     * lắm là mở đầu trang khoá, nên lối ra này không bao giờ dẫn vào chỗ chết.
     */
    exitHref: `/courses/${input.courseId}#cd-curriculum`,
  };
}

/** Thẻ góp ý — nói rõ góp ý đi về đâu (bản cũ: "Góp ý cho chúng tôi"). */
export const FEEDBACK = {
  title: 'Góp ý cho nhóm làm khoá',
  text: 'Khảo sát ẩn danh, khoảng 3 phút. Chỗ nào khó học, bạn nói ở đây là nhóm biết.',
  cta: 'Mở khảo sát',
} as const;
