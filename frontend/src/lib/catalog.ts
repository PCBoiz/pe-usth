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
 * đề khoá này nằm ở `scripts/seed-python-advanced-v4.ts` (`title` + `META`:
 * subtitle/description ghi vào `courses.content_meta`), còn tên đang hiển thị
 * trong DB Neon thì đổi bằng `scripts/rename-python-advanced.ts`. Sửa tên khoá
 * là phải sửa cả ba chỗ, không thì lần seed sau kéo tên cũ trở lại.
 *
 * Khoá `python` cơ bản đã gỡ khỏi trang (10/2026): chỉ còn Python Advanced, giáo
 * trình 48 bài từ scripts/pe-v4 (đồng bộ bằng scripts/pe-v4/sync_curricula.py).
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
    label: 'Advanced Python',
    title: 'Advanced Python',
    subtitle: '48 bài Python nâng cao, chạy ngay trong trình duyệt',
    description:
      'Process và subprocess, đa luồng, GUI Tkinter, SQL, NumPy, pandas, Matplotlib và dự án phân tích '
      + 'dữ liệu — chạy Python ngay trong trình duyệt: ghép code rồi chạy thật, săn lỗi, sửa code và '
      + 'trận Boss cuối chặng.',
    // Không khai `tag`: xem chú thích ở CatalogCourse.tag.
    level: 'advanced',
    // Tổng `estimated_minutes` của 48 bài là 1 725 phút ≈ 28,8 giờ. Con số cũ
    // "~48 giờ" trông như lấy 48 bài × 1 giờ rồi ghi cứng — phóng đại ~67% trên
    // trang ai cũng vào. `e2e/unit/catalog-duration.test.mjs` cộng lại từ giáo
    // trình và đòi chuỗi này khớp, để thêm/bớt bài là con số không trôi nữa.
    duration: '~29 giờ',
    lessons: lessonCount('python_advanced', 48),
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
 * Mặc định cũ (12/10/2026) là ẩn, phải đặt =on mới hiện: `/ide` gửi mã sang
 * `POST /api/python/run`, mà route đó chạy code trong container Docker
 * (src/python-runner). Nền tảng web service thường (Render chẳng hạn) chạy SẴN
 * trong container và không có Docker bên trong, nên mọi lần bấm Chạy đều trả lỗi
 * hạ tầng — thà không có thẻ còn hơn để người dùng bấm vào rồi gặp lỗi.
 *
 * 13/10/2026 đảo mặc định lại thành HIỆN, vì chỗ gây hại đã bịt ở đúng nơi:
 * `IdeClient` nhận ra trường hợp "chưa có bộ chạy" và nói một câu bình thường
 * (đang dựng, bài học vẫn chạy trong trình duyệt) thay vì dán thông điệp của
 * docker ra màn hình. Công cụ viết được code vẫn có ích khi chưa chạy được, nên
 * giữ nguyên cơ chế tắt: buổi nào không muốn thấy thì đặt cờ =off.
 */
export const TOOLS: CatalogTool[] =
  process.env.NEXT_PUBLIC_IDE_ENABLED === 'off' ? [] : [IDE_TOOL];
