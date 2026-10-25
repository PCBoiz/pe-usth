/**
 * Danh mục khóa học tĩnh — nguồn duy nhất cho trang chủ và trang chi tiết.
 *
 * Vì sao tĩnh: mọi route `/api/courses*` của backend đều đòi JWT, mà giao diện
 * đăng nhập đã bị gỡ khỏi frontend. Đọc danh mục từ API thì khách nào cũng nhận
 * 401 và trang chủ trống trơn. Nội dung dưới đây chép từ seed (id, tiêu đề, phụ
 * đề, cấp độ, thời lượng) và số bài lấy thẳng từ `curricula.json` — cùng nguồn
 * trang chi tiết đang dùng để vẽ giáo trình, nên hai chỗ không thể lệch số bài.
 *
 * Seed nào là nguồn: `prisma/seed-courses.js` KHÔNG tạo `python_advanced`. Tiêu
 * đề khoá này nằm ở `scripts/seed-python-da.ts` (`TITLE` + `META`:
 * subtitle/description ghi vào `courses.content_meta`). Sửa tên khoá là phải sửa
 * cả hai chỗ, không thì lần seed sau kéo tên cũ trở lại. (`scripts/seed-python-
 * advanced-v4.ts` và `scripts/rename-python-advanced.ts` vẫn mang tên cũ
 * "Advanced Python" — chúng là công cụ của bộ 48 bài pe-v4 đã nghỉ, đừng chạy.)
 *
 * Khoá `python` cơ bản đã gỡ khỏi trang (10/2026): chỉ còn một khoá Python.
 * 24/10/2026 khoá này đổi ruột: 48 bài pe-v4 ra, 172 bài "Python cho Data
 * Analyst" từ scripts/pe-da vào (đồng bộ bằng scripts/pe-da/sync_curricula.py).
 *
 * 13/10/2026 — gỡ nốt 6 khoá còn lại khỏi danh mục (cpp, java, htmlcss,
 * db_design, db_design_tc, db_design_nc). Buổi dùng thử với giảng viên và sinh
 * viên chỉ xoay quanh Python Advanced; một thẻ dẫn vào khoá rỗng hoặc dựng nửa
 * vời làm người thử mất lòng tin vào cả buổi. Đây là thay đổi TRÌNH BÀY: bản ghi
 * khoá trong DB và `prisma/seed-courses.js` không bị sửa, các route tự có của
 * chúng (`/courses/db_design*`, `/lesson/java`, `/lesson/htmlcss`, `/interface`)
 * vẫn chạy khi mở bằng đường dẫn trực tiếp — chỉ không còn lối vào từ trang chủ,
 * và `/courses/{cpp,java,htmlcss}` (route động, `dynamicParams = false`) thành 404.
 *
 * Sửa seed thì phải sửa cả file này (xem bẫy "hai nguồn danh sách bài" trong
 * AGENTS.md — đây là nguồn thứ ba của cùng một loại lệch).
 */
import type { GlyphKind } from '@/components/CourseGlyph';
import CURRICULA_JSON from '@/lib/curricula.json';

type Curriculum = { modules?: { title: string; lessons: string[] }[] };
const CURRICULA = CURRICULA_JSON.CURRICULA as Record<string, Curriculum>;

export type Level = 'beginner' | 'intermediate' | 'advanced';

export type CatalogCourse = {
  id: string;
  /** Nhãn ngắn dưới biểu tượng ở trang chủ. */
  label: string;
  title: string;
  subtitle: string;
  description: string;
  /**
   * Nhãn ngắn in hoa trên tiêu đề ở trang chi tiết, ghép với cấp độ thành
   * "THẺ · NÂNG CAO". KHÔNG bắt buộc: khoá nào không khai thẻ thì CourseDetail
   * bỏ HẲN dòng nhãn (13/10/2026 — bỏ nhãn "MINI-GAME · NÂNG CAO" của
   * python_advanced; để lại mỗi "NÂNG CAO" là còn trơ nửa dòng, nên cả dòng đi).
   */
  tag?: string;
  level: Level;
  duration: string;
  lessons: number;
  rating: number;
  /** Ảnh bìa ở hero trang chi tiết (đường dẫn trong /public). */
  image: string;
  /** Hai màu thương hiệu của khóa — vẽ biểu tượng ở trang chủ. */
  color: string;
  accent: string;
  /** 1–3 ký tự in trên biểu tượng. */
  mark: string;
  /** Hình biểu tượng riêng (xem CourseGlyph); bỏ trống thì dùng hình mặc định. */
  icon?: GlyphKind;
  /** Trang bài học của khóa. */
  lessonUrl: string;
};

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
};

/** Số bài = tổng bài của mọi module trong giáo trình; khóa không có giáo trình dùng `fallback`. */
function lessonCount(id: string, fallback: number): number {
  const modules = CURRICULA[id]?.modules;
  if (!modules?.length) return fallback;
  return modules.reduce((sum, m) => sum + m.lessons.length, 0);
}

export const COURSES: CatalogCourse[] = [
  {
    id: 'python_advanced',
    // Tên đổi 24/10/2026 cùng lúc đổi ruột khoá. "Advanced Python" nói sai với
    // người chưa biết Python: bài đầu (PY01) bắt đầu từ `print(12 + 9)` và 54
    // trong 172 bài ở mức "Cơ bản" — họ sẽ bỏ qua đúng khoá dành cho mình.
    // Phải TRÙNG `TITLE` trong scripts/seed-python-da.ts (hai nguồn của cùng
    // một cái tên; `e2e/unit/catalog-naming.test.mjs` canh chỗ này).
    label: 'Python cho Data Analyst',
    title: 'Python cho Data Analyst',
    subtitle: '172 bài: từ phép cộng đầu tiên tới phân tích dữ liệu',
    description:
      'Học bằng cách đọc lời giảng, đọc code kèm kết quả thật rồi tự chạy lại và sửa. Python nền '
      + 'tảng, NumPy, pandas, trực quan hoá (Matplotlib, seaborn, Plotly), OOP và sqlite3, tiến '
      + 'trình và đa luồng, Tkinter — phần lớn bài chạy ngay trong trình duyệt, những bài cần thư '
      + 'viện không có sẵn thì có hướng dẫn chạy trên máy.',
    // KHÔNG ghi số bài chạy-trong-trình-duyệt vào phần giới thiệu: tỉ lệ đó đổi
    // theo từng lần dựng lại pe-da — chiều 24/10/2026 nó đi 133 → 130 → 128
    // trong vòng một giờ. Con số chính xác nằm ở phần "Yêu cầu" của
    // `curricula.json`, do scripts/pe-da/sync_curricula.py sinh lại mỗi lần
    // dựng, nên nó không trôi khỏi dữ liệu.
    // Không khai `tag`: xem chú thích ở CatalogCourse.tag.
    //
    // `beginner` chứ không phải `advanced`: nhãn cấp độ ở trang chủ nói về NGƯỠNG
    // VÀO, mà khoá này không cần biết Python trước. Khoá vẫn đi tới đa luồng,
    // multiprocessing và Tkinter ở cuối — phần đó nằm trong giáo trình, không
    // phải trong nhãn.
    level: 'beginner',
    // Tổng `estimated_minutes` của 172 bài là 1 836 phút = 30,6 giờ (cộng từ
    // scripts/pe-da/out/lessons/*.json). Đừng ghi theo kiểu "172 bài × 1 giờ":
    // đúng cái đó từng cho ra "~48 giờ" cho bộ 48 bài trong khi thật là 28,8 —
    // phóng đại ~67% trên trang ai cũng vào. `e2e/unit/catalog-duration.test.mjs`
    // cộng lại từ giáo trình thật và đòi chuỗi này khớp.
    duration: '~31 giờ',
    lessons: lessonCount('python_advanced', 172),
    rating: 4.8,
    image: '/static/images/python.webp',
    color: '#2563eb',
    accent: '#e5334b',
    mark: 'Py+',
    icon: 'python',
    lessonUrl: '/lesson/python_advanced',
  },
];

export function findCourse(id: string): CatalogCourse | undefined {
  return COURSES.find((c) => c.id === id);
}

/**
 * Công cụ học tập — KHÔNG phải khóa học: không có giáo trình, không đăng ký,
 * không tiến độ/XP. Tách khỏi `COURSES` để không lọt vào trang chi tiết khóa
 * (`generateStaticParams`) hay số liệu tổng hợp nào đếm theo danh mục khóa.
 */
export type CatalogTool = {
  id: string;
  label: string;
  href: string;
  color: string;
  accent: string;
  mark: string;
  icon?: GlyphKind;
};

const IDE_TOOL: CatalogTool = {
  id: 'ide',
  label: 'Python IDE',
  href: '/ide',
  // Xanh navy đậm + xanh sáng: cùng bộ xanh–đỏ nhưng tối hơn khoá Python (xanh +
  // đỏ) nên hai biểu tượng vẫn phân biệt được ngay.
  color: '#111a2e',
  accent: '#4f8dff',
  mark: 'IDE',
  icon: 'ide',
};

/**
 * Thẻ "Python IDE" hiện SẴN; đặt NEXT_PUBLIC_IDE_ENABLED=off để ẩn.
 *
 * Lịch sử của cái cờ này, vì nó giải thích vì sao vẫn còn: mặc định ban đầu
 * (12/10/2026) là ẨN, phải đặt =on mới hiện — hồi đó `/ide` gửi mã sang
 * `POST /api/python/run` và route đó chạy code trong container Docker, mà nền
 * tảng web service thường (Render) đã chạy SẴN trong container nên không có
 * Docker bên trong: mọi lần bấm Chạy đều trả lỗi hạ tầng. 13/10 đảo lại thành
 * HIỆN sau khi `IdeClient` biết nói một câu bình thường thay cho thông điệp của
 * docker.
 *
 * 25/10/2026: lý do gốc đã mất hẳn — `/ide` chạy Pyodide ngay trong trình duyệt
 * và đường backend đã bị xoá khỏi repo, nên không còn tình huống "chưa có bộ
 * chạy". Giữ cờ lại vì nó vẫn có công dụng khác: buổi dạy nào không muốn học
 * viên thấy thẻ IDE thì đặt =off.
 */
export const TOOLS: CatalogTool[] =
  process.env.NEXT_PUBLIC_IDE_ENABLED === 'off' ? [] : [IDE_TOOL];
