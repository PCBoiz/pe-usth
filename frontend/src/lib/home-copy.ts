/**
 * Câu chữ dùng chung của TRANG CHỦ — tách ra khỏi `app/page.tsx` để test được
 * bằng `node --test` (xem `frontend/e2e/unit/home-page.test.mjs`).
 *
 * 19/10/2026: trang chủ cũ (bản đồ thế giới + thẻ khoá + thẻ "bắt đầu ở đâu" +
 * chân trang) đã thay bằng dashboard theo Figma 60:5137. Gỡ theo nó: INTRO,
 * SECTIONS, courseTileTags, nextStep, footerLine, LAB_TILE.tags. Phần còn lại
 * vẫn là câu chữ trang mới đang in.
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
 *    cũng phải là loại CHỈ TĂNG, và chỉ hiện khi có dữ liệu thật. (Trang chủ
 *    cũ không gọi API nên không có chỉ số nào; trang mới đọc tiến độ thật qua
 *    `apiFetchSessionOnly`, chỉ khi đã có phiên — xem `app/page.tsx`.)
 *  · KHÔNG KHOÁ GÌ. Mọi chặng, mọi bài đều vào được — bản đồ tám nút và hàng
 *    bài bấm được đã là bằng chứng.
 *  · THUẬT NGỮ: khoá · chặng · bài · màn, và trình soạn code gọi là
 *    "Bàn thí nghiệm" (không gọi IDE).
 *
 * LUẬT VIẾT CÂU CHỮ — rút ra từ thẻ "bắt đầu ở đâu" của trang chủ cũ, thẻ từng
 * có bốn lớp chú giải quanh đúng một cái nút ("hệ thống chọn", "Vì sao bài
 * này", "Đây là gợi ý, không phải lệnh", lối ra "Tự chọn bài"). Cả bốn sinh ra
 * từ nỗi lo của NGƯỜI LÀM, không từ nhu cầu của người đọc. Áp cho mọi câu sau:
 *  1. Đừng kể về cơ chế của chính mình. "Hệ thống chọn" là chuyện nội bộ.
 *  2. Đừng trả lời câu hỏi chưa ai hỏi.
 *  3. Đừng rào đón. Một gợi ý không cần nói nó là gợi ý.
 *  4. Một lối ra chỉ đáng có khi không còn lối nào khác.
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
} as const;

/** Thẻ góp ý — nói rõ góp ý đi về đâu (bản cũ: "Góp ý cho chúng tôi"). */
export const FEEDBACK = {
  title: 'Góp ý cho nhóm làm khoá',
  // Hai dự kiện ngưỗi đọc cần TRƯỚC khi bấm: ẩn danh, và mất bao lâu. Câu
  // "Chỗ nào khó học, bạn nói ở đây là nhóm biết" đã bỏ — nó chỉ dẫn dắt.
  text: 'Khảo sát ẩn danh, khoảng 3 phút.',
  cta: 'Mở khảo sát',
} as const;
