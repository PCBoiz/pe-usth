/**
 * PHỄU TIẾN ĐỘ theo `sort_order` — phần THUẦN, không chạm DB.
 *
 * ── VÌ SAO TÁCH RA ───────────────────────────────────────────────────────
 * Cùng khuôn `lesson-content-update.ts`: phần CÓ THỂ SAI là phép cộng và phép
 * che ô nhỏ, và nó phải chấm được bằng Jest mà không cần `DATABASE_URL`. Script
 * `scripts/pheu-tien-do.ts` chỉ lo đi lấy hàng rồi gọi vào đây.
 *
 * ── ĐƠN VỊ ĐO LÀ "TÀI KHOẢN KHÁCH", KHÔNG PHẢI "NGƯỜI DÙNG" ──────────────
 * Refresh token của khách sống 30 ngày (`JWT_GUEST_REFRESH_EXPIRES`). Hết hạn
 * là `apiFetch` rơi xuống `ensureGuest()` và cấp một tài khoản MỚI. Nên một
 * người quay lại sau 30 ngày đếm thành HAI tài khoản, và mọi tỉ lệ "còn lại"
 * bị kéo XUỐNG. Gọi nó là "tỉ lệ bỏ học" là nói sai về chính dữ liệu mình có —
 * đúng họ bẫy `apiFetchSessionOnly` mà AGENTS.md đã ghi: đặt tên một thứ không
 * tồn tại thì người đọc tưởng đang có một lớp bảo đảm.
 *
 * ── MẪU SỐ PHẢI LÀ `enrollments`, KHÔNG PHẢI `lesson_progress` ───────────
 * ĐÃ ĐO: `lesson_progress` chỉ được ghi trong `completeLesson`
 * (`src/lessons/lessons.service.ts`), nên nó đo HOÀN THÀNH chứ không đo MỞ —
 * người mở bài 1 rồi bỏ KHÔNG để lại hàng nào. Nhưng mở bài là TỰ GHI DANH
 * (`useLessonData.ts`), nên `enrollments` mới là dấu "đã đến". Lấy
 * `lesson_progress` làm mẫu số thì ô 1 luôn = 100% THEO CẤU TẠO, tức giấu đúng
 * cái ô rơi lớn nhất.
 */

/** Một tài khoản đã ghi danh khoá đang xét. */
export type HangGhiDanh = {
  userId: number;
  /** Dùng để tách khách (`@guest.local`) khỏi tài khoản thật. */
  email: string;
};

/** Một lần HOÀN THÀNH bài (một hàng `lesson_progress` đã nối với `lessons`). */
export type HangHoanThanh = {
  userId: number;
  sortOrder: number;
};

export type OPheu = {
  sortOrder: number;
  /** Số tài khoản đã hoàn thành bài này. `null` = bị che vì dưới ngưỡng. */
  soTaiKhoan: number | null;
  /** % so với số tài khoản ĐÃ GHI DANH. `null` = bị che. */
  phanTram: number | null;
  /** Bị che vì ô nhỏ hơn `O_TOI_THIEU`. */
  cheVìÍt: boolean;
};

export type KetQuaPheu = {
  donVi: 'tài khoản khách';
  daGhiDanh: number;
  /** Tài khoản ghi danh mà KHÔNG hoàn thành bài nào — ô rơi lớn nhất. */
  ghiDanhKhongHoanThanh: number | null;
  o: OPheu[];
  gioiHan: string[];
};

/**
 * NGƯỠNG Ô TỐI THIỂU. Một tỉ lệ tính từ 3 tài khoản không phải một tỉ lệ, nó
 * là ba quan sát — và in nó ra dưới dạng "%" mời người đọc tin vào một con số
 * không có. Ô nhỏ hơn ngưỡng thì in `·`, không in số.
 *
 * CHỈ ĐƯỢC NÂNG (xem `scripts/nguong-mot-chieu.json`): hạ nó là nới chính phép
 * che mà nó sinh ra để làm.
 */
export const O_TOI_THIEU = 5;

/** Hậu tố email của tài khoản khách. Khai lại ở đây vì script không nạp Nest. */
export const HAU_TO_KHACH = '@guest.local';

/**
 * DANH SÁCH CHỈ SỐ KHAI TRƯỚC.
 *
 * Khai trước là để không đi tìm con số nào đẹp rồi mới gọi nó là kết quả. Hàm
 * `dungPheu` TỪ CHỐI in một chỉ số không có trong danh sách này — nên thêm một
 * chỉ số là một dòng diff có người đọc, không phải một tác dụng phụ.
 *
 * Tên KHÔNG được chứa "người dùng" / "user": đơn vị thật là TÀI KHOẢN, và một
 * người có thể là nhiều tài khoản (xem chú thích đầu file). `kiemTenChiSo` bắt
 * chỗ này.
 */
export const CHI_SO_KHAI_TRUOC = [
  'số tài khoản khách đã ghi danh',
  'số tài khoản khách hoàn thành ít nhất một bài',
  'số tài khoản khách hoàn thành bài thứ N',
  // Tên này ban đầu tôi viết là "tỉ lệ còn lại ở bài thứ N so với số đã ghi
  // danh" — và `kiemTenChiSo` TỪ CHỐI nó vì không có chữ "tài khoản", làm 9/14
  // ca đỏ ngay lần chạy đầu. Luật bắt đúng tác giả của nó: một tỉ lệ không nói
  // ra đơn vị là tỉ lệ sẽ bị đọc thành "% người học".
  'tỉ lệ tài khoản khách còn lại ở bài thứ N so với số đã ghi danh',
] as const;

const CAM = ['người dùng', 'nguoi dung', 'user', 'học viên', 'hoc vien'];

/**
 * Một tên chỉ số hợp lệ? Trả về lý do từ chối, hoặc `null` nếu đạt.
 *
 * Vì sao cấm cả "học viên": nó cũng là một NGƯỜI, và chỗ này đếm TÀI KHOẢN.
 * Dùng từ chỉ người ở nhãn một con số đếm tài khoản là cách dễ nhất để cả đội
 * cùng tin vào một tỉ lệ cao hơn sự thật.
 */
export function kiemTenChiSo(ten: string): string | null {
  const t = ten.toLowerCase();
  for (const c of CAM) {
    if (t.includes(c)) {
      return (
        `tên chỉ số "${ten}" chứa "${c}" — đơn vị thật là TÀI KHOẢN, không phải ` +
        'người. Khách 30 ngày nên một người quay lại đếm thành hai tài khoản.'
      );
    }
  }
  if (!t.includes('tài khoản')) {
    return `tên chỉ số "${ten}" không nói ra đơn vị — phải có chữ "tài khoản".`;
  }
  return null;
}

/**
 * Dựng phễu. `tongBai` là số bài của khoá; ô nào không ai hoàn thành vẫn được
 * in (một dãy đứt quãng giấu mất chỗ người học dừng lại).
 */
export function dungPheu(
  ghiDanh: HangGhiDanh[],
  hoanThanh: HangHoanThanh[],
  tongBai: number,
  chiKhach = true,
): KetQuaPheu {
  for (const ten of CHI_SO_KHAI_TRUOC) {
    const loi = kiemTenChiSo(ten);
    if (loi) throw new Error(`CHI_SO_KHAI_TRUOC không hợp lệ: ${loi}`);
  }

  const tapKhach = new Set(
    ghiDanh
      .filter((g) => !chiKhach || g.email.endsWith(HAU_TO_KHACH))
      .map((g) => g.userId),
  );
  const daGhiDanh = tapKhach.size;

  // Gom theo bài. `Set` chứ không đếm hàng: khoá chính là (user_id, lesson_id)
  // nên trùng không xảy ra hôm nay — nhưng một ngày ai đó đổi khoá thì phép
  // đếm hàng sẽ thổi phồng con số mà không gì báo.
  const theoBai = new Map<number, Set<number>>();
  const coItNhatMot = new Set<number>();
  for (const h of hoanThanh) {
    if (!tapKhach.has(h.userId)) continue;
    coItNhatMot.add(h.userId);
    let s = theoBai.get(h.sortOrder);
    if (!s) {
      s = new Set();
      theoBai.set(h.sortOrder, s);
    }
    s.add(h.userId);
  }

  const o: OPheu[] = [];
  for (let i = 1; i <= tongBai; i += 1) {
    const n = theoBai.get(i)?.size ?? 0;
    const chePhepDo = n > 0 && n < O_TOI_THIEU;
    o.push({
      sortOrder: i,
      soTaiKhoan: chePhepDo ? null : n,
      // Ô bị che thì KHÔNG được in % — in % của một ô đã che là trả lại đúng
      // con số vừa giấu đi, chỉ ở dạng khác.
      phanTram:
        chePhepDo || daGhiDanh === 0
          ? null
          : Math.round((1000 * n) / daGhiDanh) / 10,
      cheVìÍt: chePhepDo,
    });
  }

  const roiNgay = daGhiDanh - coItNhatMot.size;

  return {
    donVi: 'tài khoản khách',
    daGhiDanh,
    ghiDanhKhongHoanThanh:
      roiNgay > 0 && roiNgay < O_TOI_THIEU ? null : roiNgay,
    o,
    gioiHan: GIOI_HAN,
  };
}

/**
 * GIỚI HẠN — in CÙNG bảng, không để ở một file khác.
 *
 * Một bảng số đi một mình sẽ bị trích dẫn một mình. Mọi câu ở đây đều là thứ
 * làm người đọc hiểu SAI con số nếu không có nó.
 */
export const GIOI_HAN = [
  'ĐƠN VỊ LÀ TÀI KHOẢN KHÁCH, KHÔNG PHẢI NGƯỜI. Refresh token của khách sống ' +
    '30 ngày; hết hạn là cấp tài khoản MỚI. Người quay lại sau 30 ngày đếm ' +
    'thành hai tài khoản, nên mọi tỉ lệ "còn lại" ở đây là GIỚI HẠN DƯỚI. ' +
    'ĐỪNG gọi nó là tỉ lệ bỏ học.',
  'MẪU SỐ LÀ "ĐÃ GHI DANH", và ghi danh xảy ra TỰ ĐỘNG khi mở bài đầu tiên. ' +
    'Nên nó đếm cả người mở một bài rồi đóng ngay — kể cả bot. Không có cách ' +
    'nào phân biệt bằng dữ liệu đang có.',
  'TỬ SỐ LÀ HOÀN THÀNH, KHÔNG PHẢI MỞ. `lesson_progress` chỉ được ghi ở ' +
    '`completeLesson`, nên người đọc hết bài 7 mà không bấm "Hoàn thành" không ' +
    'xuất hiện ở ô 7. Phễu này đo việc NỘP, không đo việc ĐỌC.',
  `Ô dưới ${O_TOI_THIEU} tài khoản in "·" thay cho số: một tỉ lệ tính từ vài ` +
    'quan sát không phải một tỉ lệ.',
  'KHÔNG có dấu thời gian trong bảng — một tài khoản ghi danh hôm qua chưa kịp ' +
    'học hết 179 bài, nên các ô cuối LUÔN thấp vì lý do cơ học. So hai lần chạy ' +
    'cách nhau vài tuần thì phải nhớ điều đó.',
];
