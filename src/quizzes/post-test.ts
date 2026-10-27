import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * KHO ĐỀ BÀI HẬU KIỂM CÓ TRỄ — 516 câu trắc nghiệm mà người học CHƯA TỪNG THẤY.
 *
 * Mỗi bài trong gói practice có 1 gốc câu hỏi + 5 biến thể.
 * `scripts/pe-da/build.py` phát 3 câu đầu vào `step_2.mcq` của 172 bài (516
 * câu) — học viên gặp chúng ngay trong bài. Ba biến thể còn lại được giữ lại,
 * và `scripts/pe-da/build_posttest.py` dựng chúng thành file JSON cạnh file
 * này. Chi tiết "vì sao" nằm ở đầu script đó.
 *
 * VÌ SAO KHO NẰM Ở PHÍA SERVER chứ không trong `content_json`: `content_json`
 * được GỬI RA FRONTEND mỗi lần mở bài, nên đáp án hậu kiểm sẽ đi qua máy người
 * học trước khi họ làm bài — hỏng đúng cái tính chất khiến bộ này đáng dùng
 * (`submitQuiz` chấm theo snapshot DB, `stripAnswers` không gửi
 * `correct`/`explanation`, mỗi đề nộp được một lần). Thêm nữa, nhồi vào
 * `content_json` là phải nạp lại 172 bài vào DB.
 *
 * ĐỌC MỘT LẦN lúc nạp module, KHÔNG đọc lại mỗi request: 565 KB JSON parse mất
 * vài chục ms, mà cổng hậu kiểm được gọi ở mỗi lần mở trang khoá học. Thiếu
 * file thì `readFileSync` ném NGAY lúc boot — đúng hướng muốn: một kho rỗng
 * lặng lẽ là đúng cái bẫy mà kho quiz 516 câu đã mắc một lần (`normalizeQuestion`
 * trả null cho mọi câu sai hình dạng, không ngoại lệ nào được ném).
 *
 * `nest-cli.json` phải chép file JSON này sang `dist/` (mục `assets`) — nếu
 * không thì chạy `npm run start:prod` là ném ENOENT ở bước boot.
 */
const DUONG_DAN = join(__dirname, 'post-test-bank.json');

interface MucKho {
  lesson_code: string;
  title: string;
  /** Mã câu trong gói gốc — chỉ để truy vết, không ai đọc lúc chạy. */
  source_ids: string[];
  /**
   * Hình dạng Y HỆT `step_2.mcq`: `{ question, options: [{ text, detail?,
   * correct? }], explanation? }`. Giữ y hệt là có chủ đích — `normalizeQuestion`
   * của QuizzesService đọc được ngay, không phải thêm nhánh nào. Để `unknown`
   * ở đây vì chính `normalizeQuestion` mới là chỗ có quyền nói câu nào dùng
   * được.
   */
  questions: unknown[];
}

interface Kho {
  schema: string;
  course_id: string;
  practice_sha256: string;
  held_back_from: number;
  lessons: MucKho[];
}

const KHO = JSON.parse(readFileSync(DUONG_DAN, 'utf8')) as Kho;

/** Nhãn ghi vào `quizzes.kind` cho đề hậu kiểm. Xem migration cùng tên. */
export const POST_TEST_KIND = 'post_test';

/**
 * Mặc định của `POSTTEST_DELAY_DAYS` — phải TRÙNG `.default(7)` ở
 * env.validation.ts.
 *
 * 7 NGÀY LÀ QUY ƯỚC, KHÔNG PHẢI CON SỐ CÓ BẰNG CHỨNG RIÊNG. Viết rõ ra vì rất
 * dễ trích sai: "luật 10-20%" của Cepeda et al. (2008) điều chỉnh KHOẢNG CÁCH
 * GIỮA HAI LẦN HỌC và lấy khoảng trễ kiểm tra làm thứ CHO TRƯỚC, nên nó không
 * sinh ra khuyến nghị nào về việc đặt trễ bao lâu. (Càng không được gộp ba dải
 * tỉ lệ đang lưu hành — 10-20%, 20-40%/5-10%, 10-40% — chúng từ ba nghiên cứu
 * khác nhau.) Thứ bảo vệ được là **≥ 1 ngày**: hiệu ứng kiểm tra lớn hơn khi
 * trễ ít nhất một ngày. 7 ngày không bị bằng chứng nào phản đối và là một tuần
 * tròn nên dễ nói với người thử — đổi được.
 *
 * TRẦN THÌ CÓ RÀNG BUỘC CỨNG, và nó đến từ chính nền này chứ không từ tài
 * liệu: phiên của tài khoản khách sống theo `JWT_GUEST_REFRESH_EXPIRES`, mặc
 * định **30 ngày**. Hết hạn là `apiFetch` rơi xuống `ensureGuest()` và cấp một
 * tài khoản MỚI — tiến độ cũ vẫn còn trong DB nhưng người đó không còn là
 * `userId` đó nữa, nên bài hậu kiểm không ghép được với tiền kiểm. Tức là
 * KHOẢNG TRỄ VÀ TỈ LỆ GHÉP CẶP ĐI NGƯỢC NHAU, và quá 30 ngày thì tỉ lệ ghép
 * cặp bằng 0. Đó là lý do `POSTTEST_DELAY_DAYS` bị Joi chặn ở 30.
 */
export const SO_NGAY_TRE_MAC_DINH = 7;

/** Tên biến môi trường. Hằng để test và service không gõ lệch nhau. */
export const KHOA_SO_NGAY_TRE = 'POSTTEST_DELAY_DAYS';

const MOT_NGAY_MS = 86_400_000;

/**
 * Câu hậu kiểm theo MÃ BÀI, chỉ cho khoá mà kho này nói về.
 *
 * Trả về Map RỖNG cho khoá khác, không throw: khoá `python` và khoá do quản trị
 * tạo sau này không có kho hậu kiểm, và chuyện đó phải thành "chưa đủ câu hỏi"
 * chứ không thành lỗi 500.
 */
const THEO_MA = new Map(KHO.lessons.map((m) => [m.lesson_code, m.questions]));

export function khoHauKiemCua(courseId: string): Map<string, unknown[]> {
  return courseId === KHO.course_id ? THEO_MA : new Map<string, unknown[]>();
}

/** Thông tin kho để log/kiểm, không dùng trong luồng nghiệp vụ. */
export const thongTinKho = {
  schema: KHO.schema,
  courseId: KHO.course_id,
  practiceSha256: KHO.practice_sha256,
  heldBackFrom: KHO.held_back_from,
  soBai: KHO.lessons.length,
  soCau: KHO.lessons.reduce((n, m) => n + m.questions.length, 0),
};

/**
 * Số ngày trễ, từ giá trị thô mà ConfigService trả về.
 *
 * HƯỚNG LỆCH KHÔNG ĐỐI XỨNG, và đó là lý do hàm này tồn tại thay vì một
 * `Number(...)` tại chỗ: đoán NGẮN hơn (0) là mở toang cổng trễ — bài hậu kiểm
 * hỏi về bài vừa học hôm qua, tức đo trí nhớ ngắn hạn và báo ra một con số sai
 * mà không ai biết là sai. Đoán DÀI hơn thì chỉ là cổng chưa mở. Nên giá trị
 * rác rơi về MẶC ĐỊNH 7, không bao giờ về 0.
 *
 * 0 vẫn là giá trị HỢP LỆ (tắt cổng để thử tay) — nhưng chỉ khi nó được GÕ RA,
 * không phải khi biến để trống. Joi ở env.validation.ts chặn chuỗi rỗng.
 */
export function soNgayTre(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : SO_NGAY_TRE_MAC_DINH;
}

/** Mốc "đã đủ trễ": bài hoàn thành TRƯỚC thời điểm này mới được hỏi lại. */
export function mocDuTre(soNgay: number, bayGio = Date.now()): Date {
  return new Date(bayGio - soNgay * MOT_NGAY_MS);
}

/** Lúc cổng mở, tính từ bài hoàn thành SỚM NHẤT. */
export function mocMoCong(somNhat: Date, soNgay: number): Date {
  return new Date(somNhat.getTime() + soNgay * MOT_NGAY_MS);
}
