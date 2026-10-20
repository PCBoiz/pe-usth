/**
 * TIỀN CẢNH BÀN QUAN TRẮC — hồ sơ hình học và MÀU cho `scripts/room/build_room.py`.
 *
 * Cùng kiến trúc với `star-map.ts`: **Python sinh nét, TS giữ toạ độ và màu.**
 * Bộ sinh KHÔNG được mang một mã màu nào, vì hai bản sáng/tối sẽ trôi xa nhau
 * ở đúng chỗ một con số bị chép — bản đồ vực đã trả giá cho việc chép bốn mốc
 * địa tầng sang lớp chuyển động.
 *
 * ── VÌ SAO TỆP NÀY TỒN TẠI ──────────────────────────────────────────────
 *
 * Tiền cảnh trang chủ trước đây dựng bằng `linear-gradient` của CSS, và lời
 * chê nhận về hai lần là "vẫn thua một góc học VẼ TAY". Chẩn đoán: bức trên
 * (bản đồ sao) là một bức TRANH — 46 nghìn nét — còn bức dưới là ba mảng
 * chuyển sắc. Gradient CSS không bao giờ trông như tranh, vì nó không có nét,
 * không có thớ, và bóng của `box-shadow` toả ĐỀU bốn phía nên không chỉ về
 * một nguồn sáng nào.
 *
 * Bốn thứ tệp này tồn tại để có:
 *
 *  1. **NÉT THẬT.** Gỗ có thớ, giấy có sợi, đồng có vân xước — bằng NÉT và
 *     CHẤM. `ROOM_DESK.grain`, `ROOM_BOOK.fiber`, `ROOM_PLATE.scratch`.
 *  2. **BÓNG MỘT NGUỒN.** Đèn ở trên-trái ⇒ mọi bóng lệch xuống-phải, dài
 *     ngắn theo khoảng cách tới đèn. `ROOM_SHADOW` + `ROOM_LAMP.at`.
 *  3. **ÁNH SÁNG RƠI THEO KHOẢNG CÁCH, không thấy dải.** `ROOM_LAMP.profile`
 *     là một BẢNG độ mờ tích luỹ theo bán kính, và 128 vòng chia đều theo ĐỘ
 *     MỜ (không theo bán kính) cho ~1,6/255 mã màu mỗi bước — dưới ngưỡng
 *     thấy dải ≈ 2 mã. Bầu trời đã giải đúng bài này: 16 vòng cho 14,3 mã và
 *     thấy dải rõ.
 *  4. **MÉP BÀN CẮT NGANG.** Trên `ROOM_DESK.edgeY` là TRỐNG — tấm trời lạnh
 *     lọt qua; dưới là bàn vàng. Đối lập nhiệt độ được VẼ RA, không viết
 *     thành câu.
 *
 * ── BA LUẬT KHÔNG CÓ NGOẠI LỆ ───────────────────────────────────────────
 *
 *  · **0 gradient, 0 `<filter>`** trong SVG — bộ sinh tự chặn.
 *  · **0 `id`, 0 `data-*` nào ngoài `data-lop`** — tranh vào trang bằng
 *    `<img>`, tức một tài liệu SVG RIÊNG bị cách ly: CSS của trang không khớp
 *    được selector nào bên trong, JS không `querySelector` vào được. Mọi `id`
 *    là byte chết tải ở mỗi lượt vào trang chủ.
 *  · **Độ dày nét có hàm làm tròn RIÊNG** (`wf` ở Python). Dùng hàm làm tròn
 *    TOẠ ĐỘ cho nó thì mọi nét 0,45 đơn vị thành `stroke-width="0"` — cả bức
 *    vô hình, và nhìn ra đúng "mảng phẳng tô gradient". Đã xảy ra thật ở bản
 *    đồ vực.
 *
 * Ca kiểm: `frontend/e2e/unit/room-art.test.mjs`.
 */

/**
 * KHUNG của tiền cảnh. Rộng bằng khung trời (`SKY_FRAME.width` = 1360) để hai
 * tấm xếp được lên nhau không phải co giãn; cao 360, tức 44 % chiều cao khung
 * trời 820 — bàn chiếm phần dưới, trời chiếm phần trên.
 *
 * KHÔNG `import` từ `star-map.ts`: hai bức là hai tấm độc lập, và một bức vỡ
 * build vì một hằng của bức kia đổi là đúng kiểu ràng buộc mà `build_sky.py`
 * từ chối khi nó không `import build_map.py`. Ca test so hai con số.
 */
export const ROOM_FRAME = { width: 1360, height: 360 } as const;

/**
 * THỨ TỰ LỚP — và nó LÀ thứ tự z, LÀ thứ tự vẽ. Một danh sách duy nhất, vì
 * Azgaar đã trả giá cho việc chép thứ tự lớp ở ba chỗ mà không có gì giữ cho
 * ba chỗ ấy khớp nhau.
 *
 * Ba lớp bóng, không một lớp: bóng phải nằm TRÊN vật nó đổ lên và DƯỚI vật đổ
 * ra nó. Gộp cả ba vào một lớp dưới mọi vật thì bóng com-pa rơi xuống dưới sổ
 * tay, tức biến mất — mà "vật gần che vật xa" là một trong bốn thứ bức này
 * tồn tại để có.
 */
export const ROOM_LAYERS = [
  'nen-ban',    // mặt gỗ: nền
  'tho-go',     // thớ gỗ, lỗ chân gỗ, mắt gỗ
  'khe-van',    // khe ván (đường ghép), theo phối cảnh
  'vung-sang',  // 128 vòng ánh đèn rơi trên mặt bàn + lấm tấm
  'mep-ban',    // MÉP BÀN: vết cắt giữa trời nguội và bàn vàng
  'bong-xa',    // bóng của thẻ đồng và thước
  'the-dong',   // tấm thẻ đồng khắc chú giải
  'thuoc',      // thước
  'bong-giua',  // bóng của sổ tay và chân đèn — rơi lên cả bàn, thước, thẻ
  'so-tay',     // sổ quan trắc
  'bong-gan',   // bóng com-pa — rơi lên sổ tay
  'com-pa',     // com-pa
  'den',        // đèn hổ phách (che cả mép bàn, nên vẽ sau)
  'chu',        // chữ khắc trên thẻ đồng
] as const;

export type RoomLayer = (typeof ROOM_LAYERS)[number];

/**
 * MẶT BÀN.
 *
 * `edgeY` là MÉP XA của bàn — nhìn từ phía người ngồi nên mép xa ở TRÊN. Trên
 * nó bộ sinh không vẽ một nét nào: chỗ ấy để tấm trời lọt qua.
 *
 * `horizonLift`: đường chân trời ẢO của mặt phẳng bàn, đặt cao hơn mép xa
 * `horizonLift` đơn vị. Mọi thứ theo phối cảnh (khe ván, mật độ thớ, cỡ lỗ
 * chân gỗ) tính từ ĐỘ SÂU `u = 1 / (y − horizon)` chứ không theo `y` tuyến
 * tính: mặt phẳng nhìn xiên nén dần về xa, và một mặt bàn chia đều theo `y`
 * đọc ra là một hình chữ nhật dán lên, không ra một mặt bàn.
 */
export const ROOM_DESK = {
  edgeY: 110,
  edgeWobble: 1.7,
  horizonLift: 30,
  /** Khe ván: `count` khe, chia đều theo ĐỘ SÂU (nên nén lại ở phía xa). */
  planks: { count: 7, wobble: 2.6, width: 1.1, opacity: 0.85 },
  /**
   * LỚP LÓT — vệt BẢN RỘNG phủ kín mặt bàn, tông theo ánh sáng tại chỗ.
   *
   * ── VÌ SAO LỚP NÀY PHẢI CÓ, và nó là một cái bẫy đã bắt được ───────────
   *
   * Bản đầu tô nền mặt bàn MỘT tông đều rồi để 128 vòng ánh đèn gánh cả dốc
   * sáng. Nhưng phép đo (`nen_rgb` ở Python) lại dựng nền từ thang `deskRamp`
   * theo ánh sáng — tức MÔ HÌNH đo một mặt bàn có dốc tông còn TRANH vẽ một
   * mặt bàn phẳng. Đó đúng kiểu lệch mô hình ‖ tranh đã làm bản đồ sao báo
   * "bậc giữa 47,3 %" trong khi raster đo 4,3 %.
   *
   * Lớp lót chữa nó ở phía TRANH, không ở phía phép đo: ~500 vệt bản rộng
   * chồng mép nhau, mỗi vệt lấy tông TÁN từ `deskRamp` theo ánh sáng tại chỗ
   * nó nằm. Phủ kín, nên nền thật có đúng cái dốc mà mô hình nói; và vì là
   * NÉT chứ mảng tô, mép giữa hai tông là mép rung chứ không phải một đường
   * thẳng — tức vẫn không có dải nào để thấy.
   */
  wash: { rows: 62, per: 20, overlap: 1.95, width: 1.0 },
  /**
   * THỚ GỖ. `rows` hàng thớ chia đều theo độ sâu, mỗi hàng `per` vệt dài
   * `len` ± `lenJitter`, lệch khỏi phương ngang tối đa `tilt` radian.
   *
   * 7 400 vệt là con số đã đo: 3 000 cho ra một mặt bàn lưa thưa đọc được
   * từng vệt, 14 000 vượt trần dung lượng. Mật độ cả bức hạ/nâng bằng
   * `DENSITY` ở Python, không bằng cách sửa con số này.
   */
  grain: {
    rows: 92, per: 54, len: 116, lenJitter: 0.62, tilt: 0.055, width: 0.5,
    /**
     * VÂN SÓNG LỚN — `wave` đơn vị, lấy từ một nhiễu mà HÀNG KỀ NHAU CÙNG
     * ĐỌC (`waveRow` nhỏ). Bản đầu lấy nhiễu theo `j × 0,31`, tức mỗi hàng
     * một giá trị không liên quan hàng trên: thớ rung lên xuống nhưng rung
     * ĐỘC LẬP, nên ở cỡ cả mặt bàn nó triệt tiêu và còn lại đúng những vệt
     * dài song song cách đều — tức "kim loại chải", không ra gỗ. Gỗ thật có
     * vân CHẠY THEO NHAU: cả một bó thớ cùng uốn lên rồi cùng uốn xuống.
     */
    wave: 15, waveRow: 0.085, waveX: 0.0032,
  },
  /**
   * VỆT SẪM NGẮN CẮT NGANG (tia gỗ / vết nứt thớ) — dốc hơn thớ nhiều lần,
   * ngắn, thưa. Không có chúng thì mặt gỗ chỉ có MỘT phương, và một mặt chỉ
   * có một phương là một mặt chải.
   */
  checks: { count: 300, len: 13, tilt: 0.85, width: 0.55, opacity: 0.45 },
  /** Lỗ chân gỗ — chấm, không nét. Thứ cho gỗ cái mặt rỗ li ti. */
  pores: { count: 1700, size: 0.42, opacity: 0.5 },
  /**
   * MẮT GỖ: mỗi mắt là `rings` vòng ê-líp LỒNG NHAU, méo theo góc. Đúng kỹ
   * thuật mà tinh vân dùng (đường đồng mức lồng nhau), ở cỡ nhỏ.
   *
   * ── VÀ THỚ PHẢI ĐI VÒNG QUANH CHÚNG ─────────────────────────────────────
   *
   * Ba cái mắt đã có từ bản đầu, nhưng thớ ĐI XUYÊN QUA chúng — nên chúng
   * đọc ra ba vết bẩn hình ê-líp nằm trên một mặt chải, không ra ba cái mắt.
   * Mắt gỗ là mặt cắt của một CÀNH: thớ thân cây phải tách ra ôm lấy nó rồi
   * khép lại phía sau, và chính cái tách-ôm-khép ấy là thứ mắt người nhận ra
   * "gỗ" ở khoảng cách một mét. `bend` là biên độ đẩy ra (phần của `r`),
   * `reach` là tầm ảnh hưởng (lần `r`) — xem `uon_quanh_mat` ở Python.
   */
  knotFlow: { bend: 1.25, reach: 3.4 },
  knots: [
    { x: 330, y: 334, r: 30, rings: 9, squash: 0.44, tilt: 0.22 },
    { x: 1142, y: 318, r: 46, rings: 11, squash: 0.38, tilt: -0.3 },
    { x: 836, y: 172, r: 22, rings: 8, squash: 0.5, tilt: 0.12 },
  ],
  /** MÉP BÀN: vành sáng bắt đèn, cộng một nét tối ngay trên nó. */
  rim: { width: 2.3, dark: 1.5, drop: 2.6, opacity: 0.95 },
} as const;

/**
 * ĐÈN HỔ PHÁCH — NGUỒN SÁNG DUY NHẤT của tiền cảnh, 2700 K.
 *
 * `at` là BÓNG ĐÈN (miệng chao): nó quyết định hướng của MỌI bóng đổ và độ
 * sáng của MỌI nét trong bức. `pool` là vệt sáng rơi trên mặt bàn — cùng một
 * nguồn, nhưng mặt bàn nhìn xiên nên vệt sáng là một ê-líp bị nén theo trục
 * dọc (`squash`), không một hình tròn.
 *
 * ── `profile` LÀ MỘT BẢNG, KHÔNG MỘT CÔNG THỨC ──────────────────────────
 *
 * Cùng lý lẽ với `SKY_LIGHT.profile`: đèn có một LÕI PHẲNG bão hoà ngay dưới
 * chao, một thềm, rồi một đầu gối dốc. Khớp một luỹ thừa trên cả dải thì sai
 * ở hai đầu và cho ra đúng cái "đĩa viền xuyến" mà bản gradient đang là.
 *
 * Vòng chia đều theo ĐỘ MỜ (không theo bán kính): chia theo bán kính thì vùng
 * đuôi (A đổi chậm) được quá nhiều vòng còn vùng đầu gối (A đổi nhanh) quá ít,
 * tức dải vẫn thấy ở đúng chỗ dốc nhất. Số vòng là `levels`, và bộ sinh TỰ ĐO
 * bước lượng tử rồi chặn build nếu nó vượt `ROOM_BUDGET.bandStepMax`.
 */
export const ROOM_LAMP = {
  at: { x: 268, y: 118 },
  /**
   * VỆT SÁNG trên mặt bàn. Tâm KHÔNG trùng bóng đèn: đèn chiếu chéo xuống
   * phía trước-phải, nên vệt đọng ở (472, 212) — đúng chỗ cuốn sổ mở ra. Một
   * đèn bàn soi vào chỗ làm việc, không soi vào chân chính nó.
   */
  pool: { x: 472, y: 212, squash: 0.56, warp: 0.07, segMin: 10, segMax: 56, segPer: 8.0 },
  /**
   * 152 VÒNG, KHÔNG 128 — và con số đến từ phép đo, không từ bản đồ sao.
   *
   * 128 vòng cho **2,22/255 mã màu** mỗi bước ở chỗ dốc nhất (r = 119), trên
   * trần 2 của `ROOM_BUDGET.bandStepMax`. Bước ở đây gánh CẢ bước độ mờ LẪN
   * bước MÀU (ba tông nội suy theo độ mờ tích luỹ, xem `pool_ton` ở Python),
   * nên nó lớn hơn bước của bầu trời ở cùng số vòng — bầu trời đo 1,78 với
   * 128 vòng, và 16 vòng của bản cũ đo 14,3 (thấy dải rất rõ, và đó là MỘT
   * PHẦN của cái "mảng phẳng tô gradient" bị chê bốn lần).
   *
   * Và một cái bẫy đã bắt được trên đường tới con số này: tăng số vòng lúc
   * đầu làm bước ĐO ĐƯỢC **tệ hơn** (128 → 2,22, rồi 160 → 3,12). Nguyên
   * nhân nằm ở PHÉP ĐO, không ở bức tranh — nó lấy hai điểm cách tâm `r_i`
   * và `r_i+1` mà quên hệ số méo rìa `warp`, nên bán kính HIỆU DỤNG lệch
   * 5,5 %, và ở chỗ vòng dày đặc thì 5,5 % vắt qua hai ba vòng. "Thêm vòng
   * làm dải tệ hơn" là một câu vô lý về mặt vật lý, và chính sự vô lý ấy là
   * thứ chỉ ra cái thước đang sai. Xem `pool_rgb_re`.
   */
  levels: 152,
  rimAt: 0.3,
  coreAt: 0.76,
  /** [bán kính hiệu dụng, độ mờ TÍCH LUỸ]. Phải ĐƠN ĐIỆU giảm. */
  profile: [
    [0, 1.0],
    [40, 1.0],
    [64, 0.96],
    [92, 0.9],
    [126, 0.82],
    [168, 0.72],
    [214, 0.62],
    [266, 0.52],
    [324, 0.42],
    [388, 0.32],
    [458, 0.23],
    [536, 0.155],
    [622, 0.1],
    [716, 0.06],
    [818, 0.034],
    [930, 0.017],
    [1050, 0.007],
    [1180, 0.002],
    [1320, 0.0],
  ],
  /** Lấm tấm trong vệt sáng — thứ giữ cho 128 vòng phẳng khỏi đọc ra 128 vòng. */
  stipple: { count: 1800, at: 0.04, gain: 2.2, size: 0.5, opacity: 0.4 },
  /**
   * QUẦNG TRONG KHÔNG KHÍ quanh bóng đèn — 26 vòng tròn (không nén), mờ hẳn.
   * Nó là thứ duy nhất của đèn được phép vượt lên TRÊN mép bàn: một nguồn
   * sáng không có quầng trong không khí đọc ra là một mảng sơn sáng. Và nó là
   * chỗ duy nhất ánh đèn ấm CHẠM vào trời nguội, nên `opacity` nhỏ — một
   * quầng dày là một mảng hổ phách dán lên bầu trời.
   */
  halo: { levels: 26, r: 104, opacity: 0.2 },
  /**
   * CHAO ĐÈN: hình thang, đỉnh `topY`, miệng ở `at.y`.
   *
   * ── VÌ SAO BẢN ĐẦU HỎNG, VÀ HỎNG Ở ĐÚNG VẬT KHÔNG ĐƯỢC PHÉP HỎNG ───────
   *
   * Bản đầu vẽ chao bằng MỘT mảng `shadeDark` phẳng + 26 nan dọc, và miệng
   * chao bằng HAI NÉT THẲNG nằm ngang. Trên PNG nó đọc ra "một hình nón đen
   * kẻ sọc, dưới có một thanh trắng mảnh" — tức vật PHÁT RA toàn bộ ánh sáng
   * của bức lại là vật trông ít giống thật nhất, nên mắt dừng ở đó và cả bức
   * mất tin. Mọi vật khác có thể hơi thô; cái đèn thì không.
   *
   * Ba thứ đã thiếu, và cả ba là hình học chứ không phải màu:
   *
   *  1. **MIỆNG CHAO LÀ MỘT Ê-LÍP, KHÔNG MỘT ĐOẠN THẲNG.** Miệng ở y = 118,
   *     dưới đường chân trời ảo của mặt bàn (y = 80), nên người xem nhìn
   *     XUỐNG vào trong chao và THẤY mặt trong được chiếu sáng. Một đoạn
   *     thẳng ở đó là một cái chao không có bề dày, tức một hình vẽ.
   *     `mouthSquash` là tỉ số nén của ê-líp ấy, `mouthLevels` là số vòng
   *     lồng nhau dựng vũng sáng bên trong — cùng kỹ thuật với 152 đĩa của
   *     vệt sáng, ở cỡ nhỏ.
   *  2. **MÉP DƯỚI LÀ MỘT VÀNH SÁNG, KHÔNG MỘT CẠNH SẮC.** `rimArcs` cung
   *     lồng nhau dọc nửa dưới ê-líp, mờ dần ra ngoài.
   *  3. **MẶT NGOÀI CÓ KHỐI.** `bands` dải ngang cho dốc dọc (tối ở đỉnh,
   *     ấm dần xuống miệng nơi ánh sáng rò ra), `ribs` nan dọc MỜ cho khối
   *     tròn — 26 nan đục đọc ra SỌC, 88 nan mờ đọc ra một mặt cong. Và một
   *     dải chuyển tiếp mảnh ở hai rìa (`edge`), vì kim loại nhìn gần phương
   *     tiếp tuyến thì phản xạ mạnh hơn hẳn.
   */
  shade: {
    topY: 22, topHalf: 23, mouthHalf: 63, ribs: 88, hammer: 300,
    /** Dốc dọc mặt ngoài: `bands` dải, tông `vLo`…`vHi` theo `v ** vPow`. */
    bands: 22, vLo: 0.03, vHi: 0.66, vPow: 3.1,
    /** Dải sáng mảnh ở hai rìa bóng (phản xạ gần phương tiếp tuyến). */
    edge: { at: 0.84, gain: 0.5 },
    /** MIỆNG: ê-líp nén `mouthSquash`, `mouthLevels` vòng lồng, `rimArcs` cung. */
    mouthSquash: 0.135, mouthLevels: 16, rimArcs: 5,
    /** BÓNG ĐÈN: `levels` đĩa lồng nhau — QUẦNG, không một cạnh sắc. */
    bulb: { r: 17, drop: 5.5, levels: 24, squash: 0.82 },
    stem: { width: 5.2, toY: 176 },
    /**
     * ĐẾ: `rings` vòng ê-líp lồng nhau. Vòng TRONG sáng, vòng ngoài tối —
     * bản đầu làm ngược và cái đế đọc ra một CÁI HỐ có vành sáng. Đế nằm ngay
     * dưới bóng đèn nên chỗ gần bóng nhất (tâm, hơi lệch về phía đèn) là chỗ
     * sáng nhất; không có cách nào để tâm tối hơn vành mà vẫn còn một nguồn
     * sáng duy nhất ở trên.
     */
    base: { rx: 47, ry: 13, y: 182, rings: 16 },
  },
} as const;

/**
 * SỔ QUAN TRẮC — giấy ngả vàng, mở ra. Hai trang là hai tứ giác RỘNG HƠN Ở
 * DƯỚI (phía người ngồi), nên bản thân hình đã mang phối cảnh.
 *
 * `sketch` là CHÒM SAO ĐANG ĐƯỢC DỰNG trên trang phải — không phải trang trí:
 * sổ của người quan trắc thì phải có thứ người ấy đang quan trắc, và nó là
 * cùng một hình với bức trên. `lines` là chữ viết tay: vệt rung ngắn, KHÔNG
 * phải chữ thật (chữ thật ở cỡ 7 px là một hàng mực nhoè, và nó sẽ là một câu
 * không ai dịch nổi).
 */
export const ROOM_BOOK = {
  spine: { farX: 700, farY: 196, nearX: 690, nearY: 320 },
  left: { farX: 446, farY: 208, nearX: 402, nearY: 332 },
  right: { farX: 954, farY: 202, nearX: 982, nearY: 328 },
  /** Dày trang: `count` nét mảnh dưới mép gần. */
  thickness: { count: 5, gap: 2.2, width: 0.9 },
  /** Gân gáy: `count` đường cong lồng nhau hai bên gáy. */
  curl: { count: 4, bulge: 7.0, width: 0.8 },
  rule: { count: 13, inset: 0.085, width: 0.55, opacity: 0.6 },
  fiber: { strokes: 1100, dots: 1300, len: 5.4, width: 0.4, opacity: 0.4 },
  /**
   * CHỮ VIẾT TAY — và đây là vật mắt dừng lâu nhất của bức, vì nó nằm giữa
   * vũng sáng.
   *
   * ── VÌ SAO BẢN "VỆT RUNG" ĐỌC RA MÃ VẠCH THƯA ───────────────────────────
   *
   * Bản trước rải mỗi dòng `per` = 13 VỆT RUNG rời nhau, mỗi vệt một độ dài
   * và một độ đậm riêng. Nó chữa được cái "mã vạch ĐẶC" của bản đầu tiên,
   * nhưng chỉ chữa được độ đậm — hình thì vẫn là mười ba gạch nằm ngang cách
   * nhau, tức một mã vạch thưa. Bốn thứ chữ tay có mà một hàng gạch không
   * có, và cả bốn là HÌNH HỌC chứ độ đậm:
   *
   *  1. **ĐƯỜNG NỀN.** Chữ NGỒI TRÊN một đường; thân chữ ở trên nó, nét
   *     xuống thò qua nó. Chính cái đường ấy là thứ mắt đọc ra "một dòng
   *     chữ". Mười ba gạch nằm GIỮA dòng thì không có đường nền nào cả.
   *  2. **CHỮ CAO CHỮ THẤP.** `xHeight` là thân chữ; `ascend` là nét lên
   *     (`l`, `h`, `b`) ở `riseAt` phần số chữ cái, `descend` là nét xuống
   *     (`g`, `y`, `p`) ở `dropAt`. Một dòng chữ cao đều nhau là một dòng
   *     chữ không có chữ cái nào.
   *  3. **KHOẢNG TRẮNG GIỮA TỪ KHÔNG ĐỀU.** `gapJitter` 1,5 cho khoảng
   *     cách chạy từ 0,25 tới 1,75 lần `gap`. Khoảng đều nhau đọc ra ngay
   *     là máy xếp — đó đúng là thứ đã làm bản cũ ra mã vạch.
   *  4. **NHẤC BÚT GIỮA TỪ.** `lift` phần số từ bị cắt làm hai nét, cắt ở
   *     RANH GIỮA HAI CHỮ CÁI chứ không giữa một nét.
   *
   * Cộng hai thứ nhỏ hơn: `slant` (chữ tay nghiêng phải, đỉnh nét đi trước
   * chân nét) và `drift` (đường nền trôi lên xuống rất chậm — không ai viết
   * thẳng tuyệt đối trên giấy không kẻ, mà ở đây giấy CÓ kẻ nên biên độ phải
   * nhỏ hơn hẳn khoảng dòng).
   *
   * Mọi con số dưới đây là ĐƠN VỊ KHUNG trên mặt giấy, không phần số của
   * trang: một thân chữ cao "0,02 trang" là một thân chữ đổi cỡ khi trang
   * đổi cỡ, và hai trang trái/phải không cùng cỡ.
   */
  hand: {
    rows: 9, words: 8, wordLen: 23, wordJitter: 1.15, gap: 6.2, gapJitter: 1.5,
    step: 1.6, xHeight: 2.5, ascend: 2.1, descend: 1.7, riseAt: 0.3, dropAt: 0.24,
    lift: 0.32, slant: 0.26, drift: 0.9, jitter: 0.38, width: 0.62,
  },
  sketch: {
    /**
     * Toạ độ TƯƠNG ĐỐI trong trang phải (0..1 theo hai trục của tứ giác).
     *
     * Tất cả nằm ở NỬA TRÊN trang (`v` ≤ 0,52): com-pa nằm vắt qua nửa dưới,
     * và một bản phác bị cái com-pa đè lên là một bản phác không đọc được.
     */
    stars: [
      [0.2, 0.2], [0.36, 0.11], [0.52, 0.24], [0.44, 0.44],
      [0.66, 0.39], [0.78, 0.2], [0.26, 0.46], [0.6, 0.52],
    ],
    links: [[0, 1], [1, 2], [2, 4], [4, 5], [2, 3], [3, 6], [3, 7]],
    /**
     * `opacity` 0,95 chứ 0,8: bản phác là NÉT MANG TIN (sàn 3 : 1) và nó đo
     * được **3,44 : 1** — sát sàn tới mức một lần chỉnh tông giấy bất kỳ là
     * build trượt. Nét mực đặc hơn kéo nó lên **4,23 : 1** mà không phải đụng
     * vào tông giấy, tức không kéo theo cả hai trang.
     */
    r: 1.9, width: 0.7, opacity: 0.95,
  },
} as const;

/**
 * TẤM THẺ ĐỒNG khắc chú giải.
 *
 * Nó ở xa đèn (phía phải) nhưng vẫn phải đọc được ≥ 4,5 : 1, và câu trả lời
 * KHÔNG phải "kéo nó lại gần đèn" — là ĐỒNG PHẢN QUANG. Kim loại bắt nguồn
 * sáng mạnh hơn gỗ tán xạ rất nhiều, nên `spec` cộng một dải sáng chạy ngang
 * tấm thẻ theo góc tới. Đó là một hiện tượng thật, đo được, và nó là lý do
 * chú giải đọc được ở chỗ gỗ quanh nó đã gần đen.
 */
export const ROOM_PLATE = {
  quad: [
    [1002, 170], [1298, 176], [1314, 252], [1012, 246],
  ],
  bevel: { width: 1.4, inset: 5.5 },
  /**
   * VÂN XƯỚC — **vệt CHẢI theo TRỤC DÀI của tấm**, không gạch chéo.
   *
   * ── CÁI HÌNH CHỮ NHẬT GẠCH CHÉO, và vì sao nó không phải lỗi màu ────────
   *
   * Bản đầu rải 3 400 vệt ở −41° và **2 180 vệt sống sót** (phép dò cụm viết
   * `rnd() > 0,18 + 1,5 × cum`, mà `cum` quanh 0,5 nên ngưỡng ≈ 0,93 — tức
   * nó KHÔNG lọc gì cả). Kết quả trên PNG là một ô bị bôi chéo: đúng họ với
   * chín tấm nền nhãn đã phải gỡ khỏi bản đồ sao, và đọc ra "chưa vẽ xong".
   *
   * Hai chỗ sai, và chỗ thứ nhất là HÌNH HỌC chứ mật độ: kim loại được CHẢI
   * theo MỘT hướng, và hướng ấy chạy dọc trục dài của tấm. Vệt chéo cắt qua
   * cả hai mép nên mắt đọc ra hoa văn chồng lên vật; vệt chạy dọc trục hoà
   * vào 44 dải phản quang (cũng chạy ngang) và đọc ra MẶT KIM LOẠI.
   *
   * `angle` 0,0203 rad chính là độ dốc mép trên của `quad` (6 / 296) — vân
   * chải song song với tấm, không song song với khung ảnh. Nó cũng tránh
   * đúng cái bẫy "góc chẵn xếp thẳng hàng với lưới điểm ảnh" mà góc −45°
   * mắc: 0 độ chẵn sẽ cho ra những hàng điểm ảnh liền nhau.
   */
  scratch: {
    count: 3400, angle: 0.0203, len: 52, lenJitter: 1.3, width: 0.3, opacity: 0.13,
    /** Dò CỤM: giữ vệt khi `rnd() < keep × smoothstep((fbm − lo) / wide)`. */
    clumpLo: 0.44, clumpWide: 0.2, keep: 0.5,
  },
  /**
   * DẢI PHẢN QUANG — dải sáng chạy NGANG tấm, tâm ở `at` (phần của chiều dọc
   * tấm), nửa bề rộng `half`.
   *
   * `gain` 0,9 chứ không 2,6, và con số ấy là một phép đo chứ một cái gu:
   * chữ khắc là nét SÁNG (`plateCut`, L = 0,68), nên nền của nó phải TỐI mới
   * đạt 4,5 : 1 — trần là L ≤ 0,112. `gain` 2,6 đẩy tấm thẻ lên L ≈ 0,2 và
   * tương phản TỤT về 2,9 : 1, tức dải phản quang mạnh hơn lại làm chú giải
   * khó đọc hơn. Mốc là: tấm thẻ đồng PA-TIN tối, chữ cắt lộ ra đồng thô
   * sáng (bright-cut) — không phải tấm đồng bóng với chữ tối.
   */
  spec: { at: 0.34, half: 0.46, gain: 0.9 },
  rivets: { r: 2.6, inset: 11 },
  /**
   * ĐƯỜNG VIỀN CHÌM — một rãnh khắc chạy vòng trong mép vát, nét tối ở trên
   * và nét sáng ngay dưới. Nó nói ra tấm thẻ được GIA CÔNG chứ chỉ được cắt
   * ra, và nó là thứ đóng khung bốn dòng chữ lại thành một chú giải.
   */
  groove: { u: 0.035, v: 0.07, width: 0.9 },
  /**
   * CHỮ KHẮC — **bốn dòng phải nằm TRỌN trên tấm**, và bản đầu thì không.
   *
   * Với `lead` 19 và `y` 199, dòng thứ tư rơi xuống baseline 258 trong khi
   * mép dưới tấm ở y ≈ 247: cả dòng "NÉT MỜ LÀ CHẶNG CHƯA MỞ" nằm trên GỖ,
   * không trên đồng. `do_tuong_phan_chu` không hề kêu — nó đo nền bằng
   * `nen_rgb` tại đúng chỗ chữ nằm, và gỗ ở đó tối hơn đồng nên tương phản
   * còn TỐT HƠN. Một phép đo đạt 5,03 : 1 cho một dòng chữ lơ lửng ngoài vật
   * mang nó.
   *
   * Nó sống sót vì `raster_room.py` bỏ qua thẻ `<text>`, nên chữ khắc chưa
   * từng lọt vào một lượt NHÌN nào. Nay nó có (xem mục 0b ở tệp ấy).
   */
  text: {
    size: 12, lead: 15, titleSize: 10.5, tracking: 0.1, x: 1028, y: 191,
    /** Khắc = một vệt TỐI lệch lên-trái (về phía đèn), rồi nét sáng phủ lên. */
    reliefDx: -0.8, reliefDy: -0.8,
  },
} as const;

/**
 * HAI DỤNG CỤ, và cả hai mang nghĩa — không phải đồ trang trí rải thêm.
 *
 *  · **Thước**: cái thước là ẩn dụ của chính kho mã này (`raster.py` là "cái
 *    thước"). Nó nằm phía trái, gần đèn nhất, nên nó là vật gỗ SÁNG nhất bức
 *    — và một phần của nó TỤT XUỐNG DƯỚI sổ tay, tức vật gần che vật xa.
 *  · **Com-pa**: thứ vẽ ra 128 vòng đồng tâm. Nó nằm NGANG trên sổ tay, nên
 *    bóng của nó rơi lên GIẤY chứ không lên gỗ — chỗ duy nhất trong bức chứng
 *    minh được bóng đổ bám theo vật bên dưới.
 */
export const ROOM_TOOLS = {
  ruler: {
    from: { x: 288, y: 266 }, to: { x: 612, y: 292 }, half: 15,
    ticks: { per: 13, major: 5, len: 7, majorLen: 11, width: 0.6 },
    grain: { count: 340, width: 0.4, opacity: 0.4 },
    /**
     * BỀ DÀY — mặt bên của thanh thước, và nó là thứ biến một hình chữ nhật
     * có vạch thành một VẬT NẰM TRÊN bàn.
     *
     * Bản trước có bóng đổ nhưng không có mặt bên, nên thước đọc ra một
     * hình dán phẳng có bóng — đúng cái `box-shadow` của CSS làm. Mặt bên
     * là MỘT đa giác tụt xuống `thick` đơn vị dưới mép gần, tô bằng chính
     * `rulerRamp` ở `sideGain` phần ánh sáng: mặt ấy quay XUỐNG, gần như
     * không nhận gì từ một ngọn đèn ở trên-trái.
     *
     * `sideGain` cũng vào `nen_rgb` ở Python: nếu chỉ lượt VẼ biết tới mặt
     * bên thì mô hình gọi chỗ ấy là GỖ trong khi tranh vẽ gỗ hoàng dương —
     * đúng kiểu lệch mô hình ‖ tranh mà cả bộ sinh này tồn tại để không mắc.
     */
    thick: 5.6, sideGain: 0.3, sideDx: 0.22,
  },
  divider: {
    /**
     * Khớp xoay nằm ở NỬA DƯỚI trang phải và hai mũi VẮT QUA mép gần xuống
     * mặt bàn: một dụng cụ đặt gọn trong lòng trang đọc ra là một hình vẽ
     * dán lên, còn một dụng cụ gác qua mép giấy thì có BA mặt đỡ nó (giấy,
     * mép giấy, gỗ) và bóng của nó đi qua cả ba.
     *
     * Và nó phải ở DƯỚI bản phác: bản phác là nét MANG TIN (sàn 3 : 1), mà
     * phép đo đầu tiên trượt đúng vì một ngôi phác nằm lọt dưới khớp xoay —
     * tức một phép đo nói về một nét không ai nhìn thấy.
     */
    hinge: { x: 878, y: 288 },
    legs: [{ x: 806, y: 348 }, { x: 964, y: 340 }],
    width: 3.4, knurl: { r: 8.2, teeth: 18 }, needle: 11,
    /**
     * KHỐI của hai chân, và vì sao ba nét thẳng không đủ.
     *
     * Bản trước vẽ mỗi chân bằng BA NÉT song song (sáng / giữa / tối). Ở xa
     * nó đọc được, ở gần nó là ba đường kẻ — thép thật có BỀ DÀY: một thân
     * THON (rộng ở khớp, nhỏ dần về mũi), một cạnh quay về đèn bắt sáng
     * thành một đường mảnh sắc, cạnh kia chìm, và một vệt loé chạy dọc bên
     * trong cạnh sáng. Bốn thứ ấy là bốn thứ khác nhau, không phải ba bản
     * sao của một nét.
     *
     * `taperHi`/`taperLo` là nửa bề rộng ở khớp và ở mũi, theo phần của
     * `width`. `specAt` là chỗ đặt vệt loé (phần bề rộng tính từ cạnh
     * sáng), `specLen` là phần chiều dài chân mà nó chạy.
     */
    taperHi: 0.62, taperLo: 0.2, specAt: 0.3, specLen: 0.62,
    /**
     * KHỚP XOAY ĐỔ BÓNG RIÊNG. Nó là vật tròn dày nhất của com-pa (`r` 8,2
     * so với thân 3,4), nên một cái đĩa không có bóng của chính nó đọc ra là
     * một chấm sơn trên giấy. `shadowH` là độ cao biểu kiến của riêng đĩa —
     * `ROOM_SHADOW.height.divider` là của THÂN, và dùng chung một con số cho
     * hai vật dày khác nhau là chép một con số sang chỗ nó sai.
     */
    hingeShadowH: 9.5,
  },
} as const;

/**
 * BÓNG ĐỔ — MỘT NGUỒN, nên mọi bóng chỉ về một hướng.
 *
 * Mỗi điểm bóng = điểm vật + hướng (ĐI RA KHỎI đèn) × `h` × `len`, với `h` là
 * độ cao biểu kiến của vật trên mặt bàn. Hai tầng: UMBRA ở `umbra` phần của
 * độ lệch (đậm) và PENUMBRA ở trọn độ lệch (nhạt) — hai đa giác chồng nhau là
 * cách có bóng mềm mà KHÔNG `<filter>`.
 *
 * `stipple` là lấm tấm ở vành ngoài penumbra, và nó không phải trang trí: tám
 * tấm nền nhãn của bản đồ sao đọc ra là "tám vệt bôi đen" đúng vì chúng có
 * MÉP SẮC. Một đa giác bóng không lấm tấm là một vệt bôi đen thứ chín.
 *
 * `fade`: bóng NHẠT DẦN theo khoảng cách tới đèn — xa đèn thì cả vật lẫn bóng
 * đều chìm, nên một bóng đậm như nhau ở mọi chỗ là thứ phá đúng cái nó dựng.
 */
export const ROOM_SHADOW = {
  /**
   * `len` 3,2 chứ 1,42, và lý do đọc được trên PNG: với 1,42 cái bóng của
   * cuốn sổ chỉ dài 13 đơn vị — một viền tối quanh chân vật, không một cái
   * bóng. Trên một MẶT PHẲNG NHÌN XIÊN, bóng kéo dài ra rất nhiều so với độ
   * cao vật, vì nó nằm trên mặt phẳng đang lùi ra xa; và đèn thì thấp và gần,
   * nên góc tới càng xiên. Bóng dài là thứ nói ra "đèn ở trên-trái" mạnh hơn
   * mọi thứ khác trong bức.
   */
  /**
   * `len` là độ dài bóng ở KHOẢNG CÁCH THAM CHIẾU `ref`, tính theo độ cao vật.
   *
   * ── CÁI LUẬT SAI MÀ CA TEST BẮT ĐƯỢC ──────────────────────────────────
   *
   * Bản đầu viết `k = h × len × d / max(d, 90)`, tức d > 90 thì thương số
   * bằng 1 và độ dài bóng KHÔNG phụ thuộc khoảng cách nữa — một vật ở
   * (400, 200) và một vật ở (1200, 320) đổ bóng dài BẰNG NHAU (46,0 đơn vị,
   * đo được). Đó chính là mô hình "nguồn sáng ở vô cực", tức mặt trời, tức
   * đúng thứ `box-shadow` của CSS làm; mà cả bức này tồn tại để nói rằng có
   * MỘT ngọn đèn ở trên-trái, cách đây mấy chục phân.
   *
   * Luật đúng: với một đèn cao `H` trên mặt bàn, bóng của vật cao `h` ở cách
   * đèn `d` dài xấp xỉ `h × d / H` — TUYẾN TÍNH theo `d`. Kẹp hai đầu để vật
   * ngay dưới đèn không mất bóng hẳn và vật ở góc xa không đổ bóng ra khỏi
   * khung.
   */
  len: 3.0,
  ref: 300,
  clamp: [0.5, 2.4],
  umbra: 0.5,
  umbraOpacity: 0.72,
  penumbraOpacity: 0.3,
  stipple: { per: 110, size: 0.62, opacity: 0.4 },
  fade: { at: 240, floor: 0.34 },
  contact: { width: 2.2, opacity: 0.8 },
  /** Độ cao biểu kiến (đơn vị khung) của từng vật trên mặt bàn. */
  height: { plate: 3.0, ruler: 8.0, book: 11.0, divider: 7.0, lampBase: 3.2 },
} as const;

/**
 * ÁNH SÁNG → TÔNG: mỗi vật chuyển `sang(x, y)` ∈ 0..1 thành một bậc trên
 * thang màu của nó bằng `base + gain × sáng`.
 *
 * Vì sao mỗi vật một cặp số, không một công thức chung: hệ số phản xạ của
 * giấy, gỗ, đồng và thép khác nhau cả một bậc. Một cặp số chung cho cả bốn là
 * một trong bốn vật sai — và cái sai sẽ là giấy (nó sáng nhất) hoặc gỗ (nó
 * tối nhất), tức đúng hai vật chiếm nhiều diện tích nhất bức.
 *
 * `ambient` là nền sáng của chính bầu trời phía trên cộng chút ánh bật lại.
 * Không có nó, nửa phải bức là một mảng đen tuyệt đối, tức bức lại thành một
 * hàm HAI giá trị — đúng cái đã chẩn đoán ra ở lời chê thứ năm của bản đồ sao
 * (89,7 % diện tích ở L < 0,01 so với 20,5 % của khung tham chiếu). Nhưng nó
 * phải NHỎ: ambient lớn là xoá luôn cái nguồn sáng duy nhất, và mọi bóng đổ
 * mất nghĩa cùng lúc. `ROOM_BUDGET.medianMax` chặn chiều ấy.
 */
export const ROOM_LIT = {
  ambient: 0.035,
  poolMix: 1.0,
  deskBase: 0.05,
  deskGain: 0.75,
  deskGamma: 0.85,
  grainBase: 0.1,
  grainGain: 0.85,
  /** Tỉ lệ vệt thớ là MẶT THỚ BẮT ĐÈN (nhân với ánh sáng tại chỗ). */
  grainLitAt: 0.16,
  paperBase: 0.3,
  paperGain: 0.7,
  /**
   * ĐỒNG — hai con số bị sàn 4,5 : 1 ÉP xuống, và phép đo nói rõ bao nhiêu.
   *
   * Chữ khắc là nét SÁNG `plateCut` (L = 0,699), nên nền của nó phải có
   * L ≤ 0,112 mới đạt 4,5 : 1. `brassGain` 0,55 cho ra L = 0,239 ở chỗ dải
   * phản quang mạnh nhất và tương phản TỤT về **2,59 : 1** — đo được, build
   * trượt. 0,3 giữ bậc đồng dưới `brassRamp[2]` (L = 0,099) ở mọi chỗ có
   * chữ. Nên tấm thẻ là đồng PA-TIN tối với chữ cắt sáng, không phải tấm
   * đồng bóng với chữ tối: ở khoảng cách này tới đèn, một tấm đồng bóng là
   * một vật phát sáng.
   */
  brassBase: 0.1,
  brassGain: 0.3,
  rulerBase: 0.2,
  rulerGain: 0.8,
} as const;

/**
 * NGÂN SÁCH VÀ SÀN — bộ sinh TỰ ĐO rồi chặn build, không nhận một lời dặn.
 *
 * `midShareMin` là con số đã chẩn đoán được lời chê "sơ đồ chứ không phải
 * tranh" ở bản đồ sao: một bức chỉ có đen sâu và mảng chói là một hàm HAI giá
 * trị, còn một bức tranh có phần lớn diện tích ở các bậc GIỮA. Đo trên mặt
 * bàn (phần dưới mép xa), không trên cả khung — phần trên mép xa là chỗ trống
 * để trời lọt qua, đếm nó vào là đếm một thứ bức này không vẽ.
 */
export const ROOM_BUDGET = {
  sampleStep: 3,
  bands: [0.01, 0.03, 0.08, 0.18, 0.35, 0.6, 0.85],
  midLo: 0.03,
  midHi: 0.85,
  midShareMin: 0.3,
  medianMax: 0.3,
  brightShareMin: 0.006,
  /** Bước lượng tử tối đa giữa hai vòng ánh đèn, theo MÃ MÀU 0..255. */
  bandStepMax: 2.0,
  /** Sàn tương phản: chữ 4,5 : 1, nét mang tin 3 : 1 (WCAG 1.4.3 / 1.4.11). */
  textMin: 4.5,
  inkMin: 3.0,
} as const;

/** Chữ khắc trên thẻ đồng — chú giải THẬT của bức trên, không chữ giả. */
export const ROOM_COPY = {
  title: 'CHÚ GIẢI',
  rows: [
    'MỘT NGÔI LÀ MỘT BÀI',
    'BÁN KÍNH THEO SỐ CA CHẤM',
    'NÉT MỜ LÀ CHẶNG CHƯA MỞ',
  ],
  alt: 'Bàn quan trắc dưới một ngọn đèn hổ phách — sổ quan trắc mở, thẻ đồng khắc chú giải, thước và com-pa.',
  font: 'ui-serif, Georgia, serif',
} as const;

export interface RoomProfile {
  /** Nền kiểm: màu trời phía trên mép bàn. CHỈ `raster_room.py` dùng, không
   *  một nét nào trong tranh mang nó — vùng ấy để TRỐNG. */
  checkSky: string;
  /** Bảy tông gỗ, tối → sáng. Chỉ số chọn theo ánh sáng + nhiễu tán (dither). */
  deskRamp: readonly string[];
  /** Bốn tông thớ (tối hơn nền gỗ) + một tông bắt sáng. */
  grainRamp: readonly string[];
  grainLit: string;
  seam: string;
  rim: string;
  rimDark: string;
  /** Ba dải của vệt sáng, theo `rimAt` / `coreAt`. */
  glowRim: string;
  glowCore: string;
  core: string;
  /**
   * SÁU TÔNG CỦA CHAO ĐÈN, tối → sáng. Một mảng `shadeDark` phẳng là thứ làm
   * cái chao đọc ra "hình nón đen kẻ sọc"; dốc dọc và khối tròn của nó cần
   * một THANG, y như mặt bàn cần `deskRamp`.
   */
  shadeRamp: readonly string[];
  shadeDark: string;
  shadeMid: string;
  shadeLit: string;
  shadeRim: string;
  bulb: string;
  shadow: string;
  paperRamp: readonly string[];
  paperLine: string;
  paperInk: string;
  paperFiberLit: string;
  paperFiberDark: string;
  paperEdge: string;
  brassRamp: readonly string[];
  brassScratchLit: string;
  brassScratchDark: string;
  /** CHỮ KHẮC: nét SÁNG (bright-cut) + bản tối lệch về phía đèn. */
  plateCut: string;
  plateCutShade: string;
  rulerRamp: readonly string[];
  rulerTick: string;
  steelRamp: readonly string[];
}

/**
 * HỒ SƠ TỐI — và mọi tông của nó là tông NÓNG, vì đèn 2700 K là nguồn duy
 * nhất: giấy ngả vàng chứ không trắng, đồng vàng chứ không xám, bóng nâu-đen
 * chứ không xanh-đen. Một tông trung tính trong bức này là một tông được
 * chiếu bởi một nguồn sáng thứ hai không tồn tại.
 */
export const ROOM_PROFILE_DARK: RoomProfile = {
  checkSky: '#0A0C14',
  deskRamp: ['#120D09', '#1C130C', '#2A1C10', '#3C2715', '#53351A', '#6E4620', '#8C5A27'],
  grainRamp: ['#0A0705', '#140E09', '#201610', '#362314'],
  grainLit: '#B88244',
  seam: '#070504',
  rim: '#C98F3E',
  rimDark: '#140E08',
  glowRim: '#6B4318',
  glowCore: '#A9701F',
  core: '#E3B257',
  shadeRamp: ['#0C0905', '#171208', '#271C0F', '#3C2D1B', '#5C4524', '#8E6C34'],
  shadeDark: '#171208',
  shadeMid: '#3C2D1B',
  shadeLit: '#8E6C34',
  shadeRim: '#F4D28C',
  bulb: '#FFEEC4',
  shadow: '#070502',
  paperRamp: ['#37291B', '#5E4C30', '#90794F', '#C2A775', '#EBD2A0'],
  paperLine: '#544B38',
  paperInk: '#251B10',
  paperFiberLit: '#DCC594',
  paperFiberDark: '#604F36',
  paperEdge: '#2C2418',
  brassRamp: ['#2B2010', '#4C3916', '#705423', '#9C7632', '#C99D4A', '#EBC77C'],
  brassScratchLit: '#F3DCA4',
  brassScratchDark: '#2A1F0D',
  plateCut: '#F2D79E',
  plateCutShade: '#120B03',
  rulerRamp: ['#4B3B1F', '#7B6331', '#AA8844', '#D4AE66'],
  rulerTick: '#221808',
  steelRamp: ['#282521', '#564F47', '#90887B', '#D3C7B1'],
};

/**
 * HAI KHỔ — NGANG cho máy tính, DỌC cho điện thoại. Và bản dọc KHÔNG phải một
 * ô cắt ra từ bản ngang: nó là một BỐ CỤC KHÁC dựng từ cùng bộ sinh.
 *
 * ── VÌ SAO PHẢI CÓ BẢN THỨ HAI, chứ không căn lại bản ngang ──────────────
 *
 * Bản ngang là một khung hình cho bề ngang 1440: mép bàn ở trên, cuốn sổ MỞ
 * nằm giữa vũng sáng, thẻ đồng bên phải. Dải của điện thoại cao gấp đôi mà
 * hẹp bằng một phần tư, nên mọi cách căn ảnh ấy đều đẩy CUỐN SỔ VẼ vào giữa
 * dải — tức nằm ngay dưới CUỐN SỔ UI, và hai cuốn sổ chồng nghĩa lên nhau.
 * Hệ quả đo được: nửa số người xem concept thấy một bản KHÔNG CÓ TRANH, vì
 * bản 390 phải quay lại ba mảng `linear-gradient`.
 *
 * Bản đồ sao đã gặp đúng việc này và giải bằng tám ô crop `scene-M*.svg` sinh
 * từ cùng bộ sinh. Đây là cùng cách làm, với một khác biệt: ô crop của bản đồ
 * sao cắt ra từ MỘT bầu trời (toạ độ ngôi phải khớp giữa các ô), còn ở đây
 * không có gì bắt hai khổ phải trùng toạ độ — nên bản dọc được BỐ CỤC LẠI.
 *
 * ── BA QUYẾT ĐỊNH CỦA BẢN DỌC, và cả ba đến từ chỗ nó được dùng ──────────
 *
 *  1. **KHÔNG VẼ SỔ, KHÔNG VẼ THẺ ĐỒNG.** Trên điện thoại, thẻ "Sổ quan
 *     trắc" và thẻ "Chú giải" của giao diện CHÍNH LÀ cuốn sổ và tấm thẻ. Vẽ
 *     thêm một cuốn sổ sau lưng chúng là nói cùng một điều hai lần bằng hai
 *     thứ không khớp nhau.
 *  2. **ĐÈN NẰM NGOÀI KHUNG** (`at` có `y` âm). Cái chao đèn cao 160 đơn vị;
 *     trên một dải rộng 390 nó chiếm gần nửa bề ngang và che mất chỗ của thẻ
 *     đầu tiên. Thứ phải giữ là ÁNH SÁNG — vũng sáng, hướng bóng đổ, vành
 *     sáng ở mép bàn — chứ không phải cái vật phát ra nó. Mọi bóng vẫn lệch
 *     xuống-phải vì `lech_bong` đọc `at`, và `kiem_bong_mot_nguon` vẫn gác.
 *  3. **PHỐI CẢNH PHẲNG HƠN** (`horizonLift` 520 thay 30). Bản ngang nhìn
 *     xiên gắt vì nó chỉ có 250 đơn vị chiều sâu; bản dọc có 960, và cùng
 *     một độ xiên dồn 90 % chiều sâu vào 10 % trên cùng của dải — tức 850
 *     đơn vị dưới cùng thành một mảng gần như không có thớ nào.
 *
 * `density` nhỏ hơn hẳn vì CHỖ HIỂN THỊ khác: bản ngang 1 360 đơn vị trải
 * trên 2 350 px (1,73 px mỗi đơn vị), bản dọc 390 đơn vị trên 390 px (1,0).
 * Chi tiết dưới một điểm ảnh là byte chết — và đây là tệp tải trên mạng điện
 * thoại, nên trần của nó là 200 KB chứ 380.
 */
export const ROOM_FORMATS = [
  {
    key: 'ngang',
    file: 'room-ban.svg',
    frame: { width: 1360, height: 360 },
    maxKb: 380,
    density: 1,
    brightAt: 0.5,
    alt: 'Bàn quan trắc dưới một ngọn đèn hổ phách — sổ quan trắc mở, thẻ đồng khắc chú giải, thước và com-pa.',
    draw: ['den', 'so-tay', 'the-dong', 'thuoc', 'com-pa'],
    over: {},
  },
  {
    key: 'doc',
    file: 'room-ban-doc.svg',
    frame: { width: 390, height: 1000 },
    maxKb: 200,
    density: 0.72,
    /**
     * NGƯỠNG "CÓ CHỖ RỰC" — 0,35 chứ 0,5, và con số đến từ VẬT LIỆU trong
     * khung chứ một cái gu. Ở bản ngang, thứ duy nhất vượt L = 0,5 là GIẤY
     * (`paperRamp[4]` đo 0,663); gỗ dưới vũng sáng mạnh nhất chỉ tới 0,488
     * vì `core` của ánh đèn đo đúng 0,488. Bản dọc không vẽ sổ, nên một sàn
     * 0,5 ở đây không đòi "có chỗ rực" mà đòi "vẽ thêm một tờ giấy" — tức
     * một phép gác ép bỏ đúng quyết định bố cục của khổ này.
     *
     * 0,35 là ~72 % đường tới lõi: nó vẫn trượt nếu vũng sáng không chạm
     * được lõi trong khung (đúng việc cái sàn này sinh ra để làm), mà không
     * đòi một vật liệu không có ở đây.
     */
    brightAt: 0.35,
    alt: 'Mặt bàn gỗ dưới ánh đèn hổ phách hắt từ ngoài khung — thước gỗ và com-pa thép nằm ở mép dưới.',
    /**
     * CHỈ CÁI THƯỚC, và nó nằm TRONG vũng sáng ở đầu dải.
     *
     * Bản dựng đầu đặt thước và com-pa ở ĐÁY dải (y ≈ 800), chỗ giao diện
     * điện thoại còn trống. Phép đo chặn build ngay: vạch chia đo **1,05 : 1**
     * ở 14 điểm, trên sàn 3 : 1. Nguyên nhân không phải màu — đáy dải cách
     * tâm vũng sáng 820 đơn vị, tức `lamp_A` ≈ 0,03, nên CẢ cái thước lẫn
     * vạch của nó đều chìm; cách duy nhất làm con số ấy đạt là bôi sáng một
     * vật nằm trong bóng tối, tức dựng một nguồn sáng thứ hai không có.
     *
     * Bản này đặt thước ở y ≈ 190, trong lõi vũng sáng, và đổi giao diện
     * Hub để dải điện thoại chừa một băng bàn TRỐNG ở đầu — nơi vành sáng
     * mép bàn, vũng sáng và cái thước đọc được. Com-pa bỏ hẳn: chỗ duy nhất
     * còn trống cho nó là đáy dải, và một vật kim loại trong bóng tối là
     * byte chết chứ không phải một vật.
     */
    draw: ['thuoc'],
    over: {
      desk: {
        edgeY: 36,
        horizonLift: 520,
        planks: { count: 9 },
        wash: { rows: 232, per: 7 },
        grain: { rows: 300, per: 20, len: 44, wave: 9, lenJitter: 0.8 },
        checks: { count: 120 },
        pores: { count: 620 },
        knots: [
          { x: 86, y: 352, r: 26, rings: 9, squash: 0.46, tilt: 0.2 },
          { x: 318, y: 648, r: 38, rings: 10, squash: 0.4, tilt: -0.28 },
          { x: 150, y: 902, r: 21, rings: 8, squash: 0.52, tilt: 0.1 },
        ],
      },
      lamp: {
        at: { x: 40, y: -44 },
        pool: { x: 150, y: 146, squash: 0.8 },
      },
      tools: {
        /**
         * Thước nằm ở BĂNG BÀN TRỐNG mà giao diện Hub chừa ra ở đầu dải
         * (padding-top 140 px). Toạ độ ở đây và con số padding ấy là MỘT
         * ràng buộc: ảnh được đặt lệch lên đúng `edgeY` = 36, nên thước ở
         * y 112…150 rơi vào 76…114 px trên màn — trọn trong băng trống.
         * Đẩy thước xuống dưới 176 là đẩy nó ra sau thẻ "Sổ quan trắc".
         */
        ruler: { from: { x: 14, y: 112 }, to: { x: 302, y: 150 }, half: 12 },
      },
    },
  },
] as const;

export const ROOM_PROFILES: { dark: RoomProfile; light?: RoomProfile } = {
  dark: ROOM_PROFILE_DARK,
};

/**
 * ĐƯỜNG CHÂN TRỜI ẢO của mặt bàn — mọi phép phối cảnh đi qua đây.
 *
 * MỘT hàm cho cả lượt vẽ (Python) lẫn lượt kiểm (ca test), vì hai công thức
 * cho cùng một việc là hai con số sẽ lệch.
 */
export function deskHorizon(): number {
  return ROOM_DESK.edgeY - ROOM_DESK.horizonLift;
}

/** ĐỘ SÂU 0..1 của một hàng `y` trên mặt bàn: 0 ở mép xa, 1 ở mép khung. */
export function deskDepth(y: number): number {
  const h = deskHorizon();
  const a = 1 / (ROOM_DESK.edgeY - h);
  const b = 1 / (ROOM_FRAME.height - h);
  const u = 1 / Math.max(1e-6, y - h);
  return (a - u) / (a - b);
}

/** `y` của hàng ở độ sâu `t` — phép đảo của `deskDepth`. */
export function deskRowY(t: number): number {
  const h = deskHorizon();
  const a = 1 / (ROOM_DESK.edgeY - h);
  const b = 1 / (ROOM_FRAME.height - h);
  return h + 1 / (a - (a - b) * t);
}

/** ĐỘ MỜ TÍCH LUỸ của ánh đèn tại bán kính hiệu dụng `re` — tra bảng. */
export function lampCumAlpha(re: number): number {
  const tb = ROOM_LAMP.profile;
  if (re <= tb[0][0]) return tb[0][1];
  for (let i = 1; i < tb.length; i += 1) {
    const [r1, a1] = tb[i];
    if (re <= r1) {
      const [r0, a0] = tb[i - 1];
      const t = r1 > r0 ? (re - r0) / (r1 - r0) : 0;
      return a0 + (a1 - a0) * t;
    }
  }
  return 0;
}

/**
 * BÁN KÍNH mà tại đó độ mờ tích luỹ bằng `a` — phép đảo của `lampCumAlpha`.
 *
 * `a` ≥ giá trị đầu bảng trả về MÉP NGOÀI của thềm bão hoà, không tâm: bảng
 * mở đầu `[0, 1]` rồi `[40, 1]`, nên trả về 0 là một đa giác suy biến và cái
 * lõi bão hoà KHÔNG ĐƯỢC TÔ. Bản đồ sao đã mất đúng cái lõi ấy một lần, và
 * chỉ raster hoá mới bắt được.
 */
export function lampRadiusOf(a: number): number {
  const tb = ROOM_LAMP.profile;
  if (a >= tb[0][1]) {
    // `: number` tường minh — `as const` làm `tb[0][0]` mang kiểu LITERAL `0`,
    // nên không gán được một mốc khác vào.
    let r: number = tb[0][0];
    for (const [rr, aa] of tb) {
      if (aa >= a) r = rr;
      else break;
    }
    return r;
  }
  for (let i = 1; i < tb.length; i += 1) {
    const [r0, a0] = tb[i - 1];
    const [r1, a1] = tb[i];
    if (a1 <= a && a <= a0) {
      if (a0 === a1) return r1;
      return r0 + (r1 - r0) * ((a0 - a) / (a0 - a1));
    }
  }
  return tb[tb.length - 1][0];
}

/** Bán kính của `levels` vòng, chia đều theo ĐỘ MỜ (không theo bán kính). */
export function lampRings(levels = ROOM_LAMP.levels): number[] {
  return Array.from({ length: levels }, (_, i) => lampRadiusOf((i + 1) / levels));
}

/**
 * HƯỚNG VÀ ĐỘ DÀI bóng của một điểm vật ở độ cao `h` — MỘT hàm cho cả lượt
 * vẽ lẫn lượt kiểm "mọi bóng lệch xuống-phải".
 */
export function shadowOffset(x: number, y: number, h: number): [number, number] {
  const dx = x - ROOM_LAMP.at.x;
  const dy = y - ROOM_LAMP.at.y;
  const d = Math.hypot(dx, dy) || 1;
  const [lo, hi] = ROOM_SHADOW.clamp;
  const k = h * ROOM_SHADOW.len * Math.min(hi, Math.max(lo, d / ROOM_SHADOW.ref));
  return [(dx / d) * k, (dy / d) * k];
}

/** Hệ số mờ của bóng theo khoảng cách tới đèn (xa đèn thì bóng nhạt dần). */
export function shadowFade(x: number, y: number): number {
  const d = Math.hypot(x - ROOM_LAMP.at.x, y - ROOM_LAMP.at.y);
  const f = ROOM_SHADOW.fade;
  return f.floor + (1 - f.floor) * Math.max(0, 1 - Math.max(0, d - f.at) / 900);
}
