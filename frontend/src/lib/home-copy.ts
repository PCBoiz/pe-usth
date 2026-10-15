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
 * Thẻ "bắt đầu ở đâu" của trang chủ: một tên bài và một cái nút.
 *
 * ===========================================================================
 * VÌ SAO NÓ TỪNG DÀI GẤP BỐN, VÀ VÌ SAO BỊ CẮT
 * ===========================================================================
 * Bản cũ có bốn lớp chú giải quanh đúng một cái nút:
 *   · nhãn "Gợi ý bước tiếp · hệ thống chọn" — kể về cơ chế bên trong;
 *   · một đoạn "Vì sao bài này" giải thích rằng bài mở đầu không đòi bài nào
 *     trước đó — tức là giải thích vì sao bài 1 là bài 1;
 *   · câu "Đây là gợi ý, không phải lệnh" — lời rào đón cho một gợi ý;
 *   · một lối ra "Tự chọn bài", trong khi danh sách 48 bài nằm ngay trang khoá
 *     mà thẻ khoá học ở cột bên trái đã dẫn tới.
 *
 * Cả bốn đều sinh ra từ lý lẽ của NGƯỜI LÀM chứ không từ nhu cầu của người
 * đọc: bản thiết kế dặn "thẻ gợi ý thiếu lý do và lối ra thì thành mệnh lệnh",
 * nên mỗi lớp được thêm vào để chống một nỗi lo. Nhưng người mở trang chủ
 * không có nỗi lo nào trong số đó — họ muốn biết bắt đầu ở đâu rồi bấm vào.
 *
 * LUẬT RÚT RA, áp cho mọi câu chữ sau này:
 *  1. Đừng kể về cơ chế của chính mình. "Hệ thống chọn" là chuyện nội bộ.
 *  2. Đừng trả lời câu hỏi chưa ai hỏi. Không ai thắc mắc vì sao bài 1 đứng
 *     đầu.
 *  3. Đừng rào đón. Một gợi ý không cần nói nó là gợi ý; nếu bấm vào là làm
 *     theo lệnh thì vấn đề nằm ở thiết kế, không ở lời đính chính.
 *  4. Một lối ra chỉ đáng có khi không còn lối nào khác.
 */
export type NextStep = {
  /** Mã + tên bài — thứ duy nhất ở đây là thông tin. */
  title: string;
  ctaLabel: string;
  ctaHref: string;
};

export function nextStep(input: {
  courseId: string;
  lessonUrl: string;
  /** Tên bài đầu, ví dụ "P01 · Program, process và tài nguyên". */
  firstLesson?: string;
}): NextStep {
  return {
    title: input.firstLesson?.trim() || 'Bài 1',
    ctaLabel: 'Mở bài',
    // `?lesson=` đếm từ 0 (xem lesson/python_advanced/page.tsx).
    ctaHref: `${input.lessonUrl}?lesson=0`,
  };
}

/**
 * Chân trang.
 *
 * Bản cũ viết thẳng trong JSX: "© 2026 Programming EDU. Học lập trình trực quan
 * và hiệu quả." Nửa sau là một LỜI HỨA VỀ CHẤT LƯỢNG do chính sản phẩm tự
 * phong, đúng loại câu mà `SECTIONS.toolNote` ở trên đã chép lại luật để tránh
 * ("không hứa hẹn gì về chất lượng; chỉ nói chỗ dùng"). Và nó không kiểm được:
 * "trực quan" với "hiệu quả" không có số nào ở sau, không có đo nào — giống
 * `rating: 4.8` đã gỡ ở a04c3cf, chỉ là không có ô sao để ai thấy ngay là bịa.
 *
 * Nhưng bản sửa ĐẦU TIÊN rơi sang phía ngược lại: `© 2026 Programming EDU ·
 * Advanced Python · Python 3.12`. Ba mảnh danh từ nối bằng dấu chấm giữa,
 * không một động từ, chữ "Python" hai lần trong bốn từ — và chân trang của một
 * sản phẩm tiếng Việt không còn chữ tiếng Việt nào. Nó đọc như dòng footer của
 * một thư viện npm. Sửa một lời nói sai không có nghĩa là viết như biên bản.
 *
 * Bản này giữ nguyên hai ràng buộc (không hứa gì về chất lượng, không bịa số)
 * nhưng nói ra một VIỆC: khoá nào, và chạy ở đâu. "không cần cài gì" là chỗ duy
 * nhất còn mang một khẳng định, và nó đo được — bài học nạp Pyodide từ cùng
 * origin, người học không cài Python; trang khoá cũng đang nói đúng câu đó
 * trong khối "KHOÁ HỌC BAO GỒM", nên hai chỗ không nói hai kiểu.
 *
 * Số bản Python (`3.12`) thì bỏ hẳn: nó VIẾT CỨNG ngay trong template này —
 * chú thích cũ khẳng định "cả hai đều lấy TỪ DANH MỤC chứ không chép tay", mà
 * chỉ `label` là thật. Con số đúng ở đâu thì nêu ở đó (`LAB_TILE.tags`), không
 * ở một chỗ không ai đọc lại.
 *
 * Năm KHÔNG viết cứng: bản cũ ghi "© 2026", tới 2027 là tự thành sai.
 * `courseLabel` vắng (danh mục rỗng) thì bỏ hẳn nửa sau, đừng bịa tên khoá —
 * và nửa sau mở bằng chính `label`, nên đừng thêm chữ "Khoá" vào template
 * (tên khoá nào bắt đầu bằng "Khoá" là ra "Khoá Khoá …").
 */
export function footerLine(year: number, courseLabel?: string): string {
  const head = `© ${year} Programming EDU`;
  const label = courseLabel?.trim();
  return label
    ? `${head} · ${label} chạy ngay trong trình duyệt, không cần cài gì`
    : head;
}

/** Thẻ góp ý — nói rõ góp ý đi về đâu (bản cũ: "Góp ý cho chúng tôi"). */
export const FEEDBACK = {
  title: 'Góp ý cho nhóm làm khoá',
  text: 'Khảo sát ẩn danh, khoảng 3 phút. Chỗ nào khó học, bạn nói ở đây là nhóm biết.',
  cta: 'Mở khảo sát',
} as const;
