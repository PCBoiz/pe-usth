/**
 * BẢN ĐỒ SAO — dữ liệu hình thái và BẢNG MÀU ("profile") của bầu trời.
 *
 * Đặc tả: `design/v3/ban-do-sao.md` (ĐỪNG sửa tệp đó từ đây — nó là nguồn, và
 * một agent khác đang viết phần bản SÁNG vào chính nó).
 *
 * CẢ BẦU TRỜI: **tám chòm · 48 ngôi · 50 nét trong chòm · một mạch hoàng đạo
 * nét đứt · một dải Ngân Hà**. Mở rộng từ bản mẫu một chòm (M1) ngày
 * 19/10/2026, khi chủ sản phẩm xem mẫu rồi hỏi "chòm này kết nối với các chòm
 * khác như nào?" — câu đó chỉ trả lời được bằng cả bầu trời.
 *
 * BA LỚP LIÊN KẾT, và chúng phải phân biệt được bằng MẮT (đặc tả §4):
 *  · `lines` của mỗi chòm — nét LIỀN, sắc của chặng: gom các bài của một chặng
 *    thành MỘT hình. Không nói thứ tự phải học.
 *  · `SKY_ZODIAC` — MỘT cung nét ĐỨT qua M5→M6→M7→M8, sắc riêng
 *    (`profile.zodiac`): phụ thuộc THẬT duy nhất của khoá (NumPy → pandas →
 *    Matplotlib → dự án). Không nét nào nối 1→8: khoá này không có thứ tự đó.
 *  · `SKY_MILKYWAY` — thể LIÊN TỤC duy nhất mà mọi chòm đều thuộc về hoặc
 *    không thuộc về. Đây là thứ chữa lời chê "chưa có sự liên kết giữa các
 *    màn": bản vực trước thất bại vì tám gian là tám mảnh RỜI.
 *
 * KHÔNG có lớp ranh giới chòm (§4.4) — chọn quy ước Bayer 1603, không chọn
 * IAU 1930: ranh giới chia TRỌN bầu trời là một lời khẳng định rằng mọi thứ
 * đều thuộc về một chặng nào đó, mà điều đó không đúng với một khoá học.
 *
 * ── BỐN LUẬT CỦA FILE NÀY ─────────────────────────────────────────────
 *
 * 1. HÌNH THÁI Ở ĐÂY, KHÔNG Ở PYTHON. `scripts/star/build_sky.py` ĐỌC file
 *    này (toạ độ, hệ số, mọi mã màu) rồi sinh SVG. Chép một con số sang Python
 *    là một con số sẽ lệch — bản vực đã trả giá cho đúng điều đó hai lần trong
 *    cùng một ngày (AGENTS.md, mục bản đồ thế giới).
 *
 * 2. KHÔNG MÃ MÀU NÀO Ở NGOÀI `SKY_PROFILES`. Python không được ghi cứng màu;
 *    `e2e/unit/star-map.test.mjs` soi mọi mã màu trong SVG xuất ra và đòi nó
 *    có tên ở đây. Lý do không phải cho gọn: màu lạc là màu KHÔNG ĐO ĐƯỢC
 *    tương phản, mà cả bảng 4,5:1 / 3:1 của đặc tả §5 dựa vào việc đo được.
 *
 * 3. HAI PROFILE, MỘT BỘ SINH. Chủ sản phẩm đã chốt bản đồ phải có cả bản sáng
 *    lẫn bản tối, nên bộ sinh nhận `--profile <tên>` và không biết gì về màu.
 *    Ở đây chỉ có `dark`; `light` là ô trống để cắm vào, KHÔNG phải một thứ
 *    phải viết lại bộ sinh mới thêm được.
 *
 * 4. BẬC ĐỘ SÁNG KHÔNG NẰM Ở ĐÂY. Script đếm `step_4.tests` từ
 *    `scripts/pe-v4/out-advanced/lessons/*.json` và tự tính bán kính (§6.1).
 *    Thêm một ca chấm vào một bài là ngôi sao của nó tự to lên — bản đồ không
 *    bao giờ lệch với giáo trình. Viết cứng bán kính ở đây là phá tính chất đó.
 *
 * Không `import` gì: `node --test` không phân giải alias `@/…`, và tệp này
 * phải đọc được bằng cả Node (test) lẫn một bộ phân tích literal rất thô
 * (Python). Nên mọi khối dưới đây là literal thuần, khoá là định danh, chuỗi
 * nháy đơn.
 */

/** Khung bầu trời đầy đủ. Giữ đúng khung của `world-map.ts` để hợp đồng bố cục
 *  không đổi khi dựng nốt bảy chòm (đặc tả §3.1). */
export const SKY_FRAME = { width: 1360, height: 820 } as const;

/**
 * CHIA TỆP THEO LỚP — và đây là một hợp đồng, không phải một chi tiết xuất tệp.
 *
 * Bản mẫu một chòm xuất HAI tấm (nghỉ · hover) chứa đủ mười ba lớp. Nhân cách
 * đó lên tám chòm là chín tấm đầy đủ: mỗi tấm cõng lại cả tinh vân, cả 1 250
 * sao nền, cả lưới — đo được **~160 KB mỗi tấm**, tức ~1,4 MB cho một trang,
 * trong khi mốc §9.2 là 900 KB cho TẤT CẢ. Nên lớp trời tách ra thành tệp
 * RIÊNG, tải một lần, và chỉ lớp chòm mới có bản nghỉ/bản rõ cho từng chòm.
 *
 * Cái được thứ hai, và nó là lý do viết hợp đồng này ra chứ không chỉ cắt tệp
 * cho nhẹ: một agent khác đang NGHIÊN CỨU chuyện thêm chiều sâu bằng parallax
 * theo con trỏ. Parallax đòi các lớp trôi ở TỐC ĐỘ KHÁC NHAU, tức đòi chúng là
 * những phần tử DOM khác nhau. Nếu bầu trời là một tấm duy nhất thì việc đó
 * phải vẽ lại từ đầu; chia sẵn thì nó chỉ còn là mấy dòng CSS.
 *
 * `layers` của tất cả các tấm GỘP LẠI phải đúng bằng `SKY_LAYERS`, theo đúng
 * thứ tự — thứ tự tệp trong DOM LÀ thứ tự z. Ca test so lại, vì một lớp bị bỏ
 * quên là một lớp biến mất khỏi bức mà không có gì đỏ lên.
 */
export const SKY_TILES = [
  {
    file: 'troi',
    layers: [
      'nen', 'bui-xa', 'nguon-sang', 'loe-ngang', 'tinh-van', 'khe-bui',
      'soi-sang', 'quang-chan-troi',
    ],
  },
  { file: 'sao-nen', layers: ['truong-sao', 'luoi'] },
  { file: 'mach', layers: ['mach-hoang-dao'] },
  { file: 'chom', layers: ['net-chom', 'quang-sao', 'sao-bai', 'loi-sao', 'nhan'] },
] as const;

/** Dải Ngân Hà (đặc tả §4.3): một dải chạy chéo từ (0, 650) tới (1360, 230).
 *  Ở ô crop của bản mẫu ta chỉ thấy mép dưới của nó. */
export const SKY_MILKYWAY = {
  from: { x: 0, y: 650 },
  to: { x: 1360, y: 230 },
  /** Nửa bề rộng ở hai đầu và ở giữa — dải phình ở giữa (§4.3: 170–260 px). */
  halfWidth: { ends: 85, mid: 130 },
  /** Khe bụi tối chẻ dọc dải, lệch khỏi trục một chút cho khỏi đối xứng. */
  lane: { offset: -22, halfWidth: 26 },
} as const;

/**
 * MẠCH PHỤ THUỘC — cung hoàng đạo nét đứt qua M5 → M6 → M7 → M8 (§4.2).
 *
 * Phụ thuộc THẬT của khoá chỉ có một: NumPy → pandas → Matplotlib → dự án, đã
 * kiểm bằng gói thư viện từng bài. **Không một nét nào nối 1→8** — khoá này
 * không có thứ tự đó, vẽ ra là nói sai.
 *
 * Bầu trời thật có sẵn đúng một vật như vậy: hoàng đạo, một cung lớn nét đứt
 * xuyên qua một TẬP CON chòm sao và bỏ qua mọi chòm khác. Không ai nhìn hoàng
 * đạo mà nghĩ "phải đi theo thứ tự này": nó là một quan hệ, không phải một lộ
 * trình. Nên: không mũi tên, không chữ trên cung.
 *
 * NEO VÀO SAO, KHÔNG VÀO TOẠ ĐỘ. Mỗi mốc là `stars` + `offset`, nên dịch một
 * hộp chòm là cung TỰ đi theo. Chép bốn con số toạ độ sang đây là bốn con số
 * sẽ lệch — bản vực đã trả giá cho đúng điều đó.
 *
 * `stars` hai mã ⇒ lấy TRUNG ĐIỂM: ở M8 cung phải đi GIỮA hai ngôi, không sát
 * một ngôi.
 *
 * Một chỗ đặc tả §4.2 nói "đi sát sao SÁNG NHẤT của M5, M6, M7" mà hình học
 * không cho: ba ngôi sáng nhất M7 (M01 · M02 · M05, cùng 9 ca chấm) đều ở nửa
 * DƯỚI của chòm, còn M8 ở thiên đỉnh — không cung trơn nào vừa vục xuống
 * y ≈ 374 ở x ≈ 1033 vừa vươn lên y = 115 ở x = 1155 mà còn đọc ra là một cung
 * lớn. Giải bằng cách giữ đúng cái ràng buộc ĐO ĐƯỢC: cung phải đi trong
 * `nearMax` của ngôi neo đã khai cho mỗi chòm, và không bao giờ gần HƠN
 * `clearMin` tới bất kỳ ngôi nào trong 48 (§4.2 cho 14 px). Script tự đo cả
 * hai và TRƯỢT nếu vỡ. Ngôi neo của M6 và M7 chọn trong số các ngôi ĐỒNG hạng
 * sáng nhất (M6 cả chín bài cùng 8 ca) hoặc ngôi mà cung đi qua thật (M7 ·
 * M03, đỉnh trục đứng) — nói ra ở đây thay vì để một con số không ai giải
 * thích được.
 */
export const SKY_ZODIAC = {
  anchors: [
    { stars: ['N01'], offset: [-6, -25] },
    { stars: ['PD03'], offset: [2, -25] },
    { stars: ['M03'], offset: [-1, 24] },
    { stars: ['DA01', 'DA02'], offset: [0, 0] },
  ],
  /** Mịn hoá Catmull–Rom: số đoạn giữa hai mốc. */
  steps: 24,
  /** Nối dài theo TIẾP TUYẾN ở hai đầu [đầu, cuối] — một vòng tròn lớn không
   *  bắt đầu và kết thúc ở giữa trời. Cắt bởi viewBox, nên nối quá cũng chỉ
   *  tốn vài byte. */
  extend: [240, 150],
  width: 1.0,
  dash: '8 7',
  /**
   * ĐỘ MỜ 0,48, KHÔNG PHẢI 0,34 — và đây là một số đo sửa lại đặc tả.
   *
   * §4.2 ghi "1,0 px, đứt `8 7`, màu `#B9D0FF` ở độ mờ 0,34 → 4,1:1 trên nền
   * trời". Đo lại trên bức này thì 0,34 chỉ cho **2,37:1** ở chỗ trời TỐI
   * nhất (nền `#070C17`, Y = 0,0045) — dưới 3:1 của WCAG 1.4.11, và script
   * TRƯỢT ở đó. Con số 4,1:1 của đặc tả hợp lý với một "nền trời" đã được
   * tinh vân nâng sáng; nhưng mạch hoàng đạo chạy qua cả những vùng KHÔNG có
   * tinh vân nào, và chỗ tối nhất mới là chỗ quyết định.
   *
   * Nghịch lý đáng ghi lại vì nó đi ngược trực giác: thứ làm một nét sáng
   * trượt tương phản ở đây là TRỜI QUÁ TỐI, không phải trời quá sáng. 0,48
   * cho 3,6:1 ở chỗ tối nhất, và script đo lại dọc cả cung mỗi lần build nên
   * chỗ SÁNG nhất cũng không lọt.
   */
  opacity: 0.48,
  /** Bề rộng DẢI: một nét thứ hai song song, lệch theo pháp tuyến. Atlas cổ vẽ
   *  hoàng đạo là một DẢI chứ không phải một vạch. */
  bandOffset: 9,
  bandOpacity: 0.26,
  /** Cung phải đi trong bấy nhiêu px của ngôi neo — "đi SÁT" đo được. */
  nearMax: 34,
  /** …và không bao giờ gần hơn bấy nhiêu px tới MỘT ngôi nào trong 48 (§4.2). */
  clearMin: 14,
} as const;

/**
 * MỘT NGUỒN SÁNG TRỘI — và đây là thay đổi lớn nhất so với bản mẫu một chòm.
 *
 * Bản đánh giá `design/v3/chieu-sau-tuong-tac.md` §2 đo khung hình tham chiếu
 * (`design/tham-chieu/ban-do-sao-game.png`) rồi đo lại bản mẫu của mình, và
 * bốn con số nói cùng một điều:
 *
 *  | | tham chiếu | bản mẫu M1 |
 *  |---|---|---|
 *  | % diện tích L > 0,5 | **7,73%** | **0,10%** |
 *  | trung vị độ chói    | 0,0284 | bị CẤM vượt 0,0748 ở mọi điểm |
 *  | vật sáng lớn nhất   | Ø 19,7% bề rộng | Ø 0,63% bề rộng |
 *  | tỉ lệ lớn nhất : nhỏ nhất | ~45 : 1 | 3,6 : 1 |
 *
 * Tức bức tham chiếu TỐI HƠN ta ở phần lớn diện tích, nhưng dám để gần 8%
 * diện tích lên gần trắng. Thứ ta thiếu là **DẢI ĐỘ CHÓI**, không phải số
 * chiều — và thứ ép cái dải đó lại chính là trần độ chói TOÀN CỤC của §3.1.
 * Cái trần ấy tồn tại để chữ đọc được ở bất cứ chỗ nào chữ rơi vào; nhưng §8
 * đã có một bộ máy đặt nhãn TỰ ĐO độ chói và TRƯỢT BUILD nếu không tìm được
 * chỗ đủ tối. Ràng buộc "chữ đọc được" đã được giải CỤC BỘ rồi, nên trần toàn
 * cục đang làm việc mà một bộ máy khác đã làm xong. Nó bị bỏ; thay vào là
 * `SKY_BUDGET` ở dưới.
 *
 * VÌ SAO Ở ĐÚNG CHỖ NÀY. Toạ độ không chọn cho đẹp — nó là chỗ DUY NHẤT còn
 * lại sau ba ràng buộc đo được:
 *  · cách MỌI bao lồi chòm ≥ `outer` + `SKY_FIELD.ceilingPad`, nếu không độ
 *    chói trong bao lồi vượt `hullCeiling` và nét chòm ở đó tụt dưới 3:1;
 *  · cách mạch hoàng đạo ≥ `outer` — nét MANG TIN cũng phải giữ 3:1, và cung
 *    đó chạy xuyên cả nửa trên bầu trời nên nó là chỗ dễ trượt nhất;
 *  · lõi phải nằm TRỌN trong khung, vì ngân sách diện tích tính trên phần
 *    THẤY ĐƯỢC: một nguồn sáng bị mép khung cắt mất một phần ba là một nguồn
 *    sáng không đạt ngân sách.
 * Script đo cả ba và TRƯỢT nếu vỡ, nên "dịch nó cho đẹp" là một ca đỏ.
 *
 * Và nó ở đúng chỗ bầu trời thật có một vật như vậy: **Đám Mây Magellan Lớn**
 * — một đám sáng lớn nằm XA mặt phẳng Ngân Hà, trên trời nam bán cầu. Chính
 * Lacaille đặt tên *Mensa* (cái bàn) cho chòm bên dưới nó, vì đám mây ấy
 * trông như mây phủ trên Núi Bàn ở mũi Hảo Vọng. Nên một đám sáng lớn ngoài
 * dải Ngân Hà không phải một thứ bịa cho đẹp: nó là thứ người vẽ bầu trời
 * Lacaille nhìn thấy mỗi đêm.
 */
export const SKY_LIGHT = {
  at: { x: 124, y: 104 },
  /** Bán kính LÕI (vùng gần như kín sáng) và bán kính TẮT HẲN.
   *
   *  `outer` là con số quyết định khe tới bao lồi chòm nói ở trên, nên nó đã
   *  bị kéo xuống tới mức vừa đủ: nới nó là phải dịch cả bố cục tám chòm. */
  core: 92,
  outer: 150,
  /** Dựng bằng `levels` ĐA GIÁC LỒNG NHAU, tô đặc, bán kính giảm dần từ
   *  `outer` về `core` — ĐÚNG kỹ thuật của quầng sao (`SKY_MAGNITUDE
   *  .haloRings`), không phải đường đồng mức của tinh vân.
   *
   *  Hai bản trước đều dựng bằng đường đồng mức và cả hai đều hỏng NHÌN THẤY
   *  ĐƯỢC, nên ghi lại cả hai:
   *   · bản 1 trả thẳng 1,0 cho mọi điểm trong lõi ⇒ chín đường đồng mức rơi
   *     cùng một chỗ ⇒ một cái ĐĨA XÁM PHẲNG viền mấy vòng tròn;
   *   · bản 2 nhân trường với một kết cấu fBm mạnh để phá vòng tròn ⇒ trường
   *     thôi đơn điệu theo bán kính, nên mỗi mức sinh ra cả đường bao NGOÀI
   *     lẫn những đảo bên trong, và `fill-rule="evenodd"` biến tâm nguồn sáng
   *     thành một cái LỖ TỐI. Đúng loại hỏng im lặng: tệp vẫn ra, kích thước
   *     vẫn đúng, chỉ là nguồn sáng tối ở giữa.
   *  Đa giác lồng nhau không có kiểu hỏng nào trong hai kiểu đó: chúng không
   *  cắt nhau được, và thứ tự tô là thứ tự bán kính. */
  levels: 16,
  /** Bấy nhiêu vòng TRONG CÙNG tô bằng `glowCore`, số còn lại bằng `glow`. */
  coreLevels: 6,
  /** Độ mờ CỘNG DỒN ở lõi, và số mũ của sườn: `A(f) = alphaMax × f^falloff`
   *  với `f` = 0 ở `outer`, 1 ở `core`. Độ mờ của từng vòng được tính NGƯỢC
   *  từ hồ sơ này, y như cách quầng sao làm — nhờ thế "một vòng" không phải
   *  một bậc mà mắt đếm được. */
  alphaMax: 0.97,
  falloff: 1.9,
  /** Rìa MÉO theo góc: cùng một sóng cho mọi vòng (nên chúng không cắt nhau
   *  được), nhưng biên độ tăng theo bán kính — rìa ngoài xơ xác, lõi tròn
   *  hơn. Đó là hình của một đám mây sáng thật, và nó cũng là thứ giữ cho vật
   *  to nhất bức khỏi đọc ra là "cái đèn flash của phần mềm". */
  warp: 0.2,
  seg: 96,
  /** Lấm tấm trong quầng — cùng lý lẽ với lấm tấm của tinh vân: thứ giữ cho
   *  mười sáu vòng phẳng khỏi đọc ra là mười sáu cái vòng. */
  stipple: { count: 4200, size: 0.5, opacity: 0.18, at: 0.12, gain: 1.4 },
  /** Vệt loé NGANG qua nguồn sáng — đọc được bằng mắt trên khung hình tham
   *  chiếu (`chieu-sau-tuong-tac.md` §2.2) và đặc tả §3.3 đã chép nó. Nó
   *  không phải trang trí: một vệt ngang là thứ nói ra "đây là một NGUỒN
   *  SÁNG, không phải một mảng sơn sáng". */
  flare: { span: 3.4, width: 2.4, opacity: 0.26, steps: 40 },
} as const;

/**
 * NGÂN SÁCH ĐỘ CHÓI THEO DIỆN TÍCH — thay cho trần độ chói toàn cục.
 *
 * Một cái trần nói "không điểm nào được sáng hơn X". Một ngân sách nói "được
 * phép bấy nhiêu phần trăm diện tích sáng hơn X, và phần còn lại phải tối
 * hơn". Hai câu đó cho ra hai bức tranh khác nhau hẳn, và bức thứ hai là bức
 * mà khung tham chiếu đang là.
 *
 * Mốc 7,73% của khung tham chiếu là mốc để NHẮM, không phải một luật — nên
 * sàn ở đây là 2,0% (ngưỡng đi/dừng của bản đánh giá §5 bước 2) và trần 12%.
 * `medianMax` là dòng quan trọng nhất và cũng là dòng dễ phá nhất: **sáng
 * thêm ở ĐUÔI, không sáng thêm nói chung.** Nới `medianMax` là làm hỏng đúng
 * thứ đang đi tìm.
 *
 * Script đo trên lưới `sampleStep` px bằng chính các trường mà các lớp dùng,
 * cộng diện tích hình tròn của 48 ngôi, và TRƯỢT nếu ra ngoài khoảng — đúng
 * cách nó đang chặn dung lượng. Một con số trong chú thích thì không chặn
 * được gì.
 */
export const SKY_BUDGET = {
  brightAt: 0.5,
  brightShareMin: 0.02,
  brightShareMax: 0.12,
  medianMax: 0.05,
  sampleStep: 4,
  /** Tỉ lệ ĐƯỜNG KÍNH vật sáng lớn nhất : sao nền. Tham chiếu ~45:1, ngưỡng
   *  đi/dừng của bản đánh giá là 15:1. Đạt được KHÔNG BẰNG cách phóng to ngôi
   *  nào — bán kính 48 ngôi vẫn do số ca chấm quyết (luật 4 ở đầu tệp). */
  scaleRatioMin: 15,
} as const;

/** Quầng chân trời (§3.1 lớp 5 · §5.3): 170 px dưới cùng của khung. */
export const SKY_HORIZON = {
  height: 170,
  /** Dựng bằng MẬT ĐỘ NÉT ngang, không bằng một gradient dọc — cùng lý lẽ với
   *  tinh vân. `[nền, thêm theo độ sâu vào quầng]` cho độ mờ mỗi nét, bề rộng
   *  nét, và khoảng cách hai nét `[xa nhất, gần nhất]`. */
  opacity: [0.09, 0.1],
  width: 1.6,
  step: [7.0, 2.0],
  wobble: 2.2,
  /** Số nét chồng lên một điểm, dùng khi ĐO độ chói (nét dày 1,6 px mà khoảng
   *  cách gần nhất là 2 px, nên ở chỗ dày nhất khoảng 3 nét phủ một điểm).
   *  Để ở đây vì phép đo và phép vẽ phải nói cùng một con số. */
  overlap: 3,
} as const;

/** Lưới toạ độ cong (§3.3). Lưới là CHẤT LIỆU, không mang tin — tương phản
 *  1,38:1 là CỐ Ý dưới ngưỡng, để nó không cạnh tranh với nét chòm. */
export const SKY_GRID = {
  parallels: 5,
  meridians: 7,
  /** Độ võng lớn nhất ở vòng trên/dưới cùng; vòng giữa thẳng. */
  sagMax: 38,
  /** Khoảng cách kinh tuyến ở giữa khung, và hệ số hội tụ ở hai mép. */
  meridianGap: 194,
  converge: 0.82,
  width: 0.6,
  opacity: 0.16,
  dash: '3 9',
  /** Lưới ĐỨT khi cắt qua một ngôi sao mang nghĩa — đó là tín hiệu che khuất:
   *  sao nằm TRƯỚC lưới (§3.3). */
  starGap: 5,
} as const;

/** Trường sao nền (§7). Bốn hàng rào giữ nó khác hẳn 48 ngôi mang nghĩa. */
export const SKY_FIELD = {
  /** Mật độ danh nghĩa: số ngôi trên mỗi 10 000 px² của khung đầy đủ. §7.1
   *  chốt 1 250 ngôi cho 1 360 × 820 px (= 111,52 đơn vị 10 000 px²), tức
   *  **11,2** — giữ nguyên con số đó để ô crop có đúng mật độ của bức đầy đủ
   *  thay vì một con số chọn bằng mắt.
   *
   *  1 250 là một bầu trời "gian lận" CÓ CHỦ Ý, và nói ra chỗ gian lận chứ
   *  đừng để nó thành một con số không ai giải thích được: một khung trời thật
   *  cỡ 60° × 34° chỉ chứa khoảng 410 ngôi tới cấp 6,5 (giới hạn mắt thường).
   *  1 250 đủ dày để ra chất trời, và vẫn thưa hơn nhiều so với cái người ta
   *  thường vẽ — để 48 ngôi mang nghĩa còn THẮNG ĐƯỢC. */
  per10k: 11.2,
  /** Hàng rào 1: bán kính CỐ ĐỊNH, và nó nằm dưới KHE TRỐNG (1,20 → 2,20).
   *  Luật Stellarium: dưới 1,2 px thì giữ bán kính, hạ ĐỘ MỜ theo (r/1,2)³. */
  radius: 1.2,
  /** Hàng rào 3: ba bậc nền phân biệt bằng ĐỘ MỜ, không bằng bán kính. */
  tiers: [
    { share: 0.7, opacity: 0.3 },
    { share: 0.23, opacity: 0.48 },
    { share: 0.07, opacity: 0.68 },
  ],
  /** Hệ số mật độ theo vùng (§7.1). Dòng `hull` là dòng quan trọng nhất: trời
   *  LOÃNG HẲN ngay chỗ có một chòm, nên hình của chòm nổi lên khỏi nền. */
  density: { core: 3.4, edge: 1.6, plain: 1.0, lane: 0.15, far: 0.45, hull: 0.3 },
  /** Ngưỡng chia vùng: trường tinh vân trên `coreAt` là lõi, trên `edgeAt` là
   *  rìa; khe bụi trên `laneAt` là khe; xa trục dải quá `farAt` lần nửa bề
   *  rộng là "góc xa Ngân Hà nhất". */
  at: { core: 0.5, edge: 0.26, lane: 0.38, far: 2.4 },
  /** Phối cảnh khí quyển (§3.2): sao ở dải chân trời mờ đi và TO hơn — nhìn
   *  qua một lớp khí dày. Bán kính vẫn bị kẹp ở `radius`, nên "to hơn" đi vào
   *  bề rộng nét, không vào một bán kính mới làm vỡ khe trống 1,20–2,20. */
  horizonFade: 0.38,
  horizonSwell: 0.15,
  /** Sao nền phải TRÁNH nét chòm (hàng rào 4) và tránh một ngôi mang nghĩa. */
  keepOffLine: 5,
  keepOffStar: 3.4,
  /** Lấy mẫu dày gấp bấy nhiêu rồi loại theo mật độ — nhờ đó mật độ là một
   *  TRƯỜNG liên tục chứ không phải mấy ô chữ nhật. */
  overSample: 3.0,
  /** Bán kính loại trừ của nhiễu xanh = hệ số × khoảng cách trung bình. */
  blueNoise: 0.72,
  /** Nở bao lồi chòm ra bao nhiêu khi làm loãng trời (§7.1). */
  hullPad: 18,
  /** Nở bao lồi ra bao nhiêu khi ĐO trần độ chói cục bộ (§3.1). */
  ceilingPad: 24,
} as const;

/** Tinh vân (§3.1 · §9.5). Năm đường đồng mức LỒNG NHAU, mỗi cái một độ mờ
 *  phẳng — KHÔNG phải một `radial-gradient` phủ. Cộng dồn 1 − 0,85⁵ ≈ 0,56 ở
 *  lõi và 0,15 ở rìa, qua bốn bậc trung gian. */
export const SKY_NEBULA = {
  levels: 5,
  levelOpacity: 0.15,
  /** fBm: lacunarity 2,01 CHỨ KHÔNG 2,00 — lệch đi để các quãng nhiễu không
   *  xếp thẳng hàng và tạo hoa văn giả (Inigo Quilez). Họ hàng của luật "góc
   *  nét −41°, không −45°" ở bản vực. */
  lacunarity: 2.01,
  gain: 0.5,
  octaves: 5,
  baseFreq: 2.8,
  /** Bóp méo miền 2 lượt, cường độ 4,0 (§3.1). */
  warp: 2,
  warpStrength: 4.0,
  /** CÁI BẪY LỚN NHẤT của bóp méo miền: phải CHUẨN HOÁ LẠI dải giá trị. fBm
   *  sau khi bóp méo chỉ chiếm một dải hẹp (một bản port đo được
   *  [0,39 ; 0,83]); không ánh xạ lại về [0, 1] thì tinh vân ra MỘT MÀN SƯƠNG
   *  XÁM ĐỀU, không phải một đám mây — đúng cái "mảng phẳng không có chiều
   *  sâu" đã bị chê. `[gốc, bề rộng dải]`. */
  normalize: [0.34, 0.36],
  /** Trường = dải × (floorMix + (1 − floorMix) × nhiễu đã chuẩn hoá). */
  floorMix: 0.3,
  /** Ngưỡng của NĂM đường đồng mức, từ rìa vào lõi. Đây là THAM SỐ TRƯỜNG nên
   *  nó KHÔNG được hồ sơ hoá (§19.2 dòng 5): Ngân Hà phải cùng một hình dạng ở
   *  cả hai bản, và nhờ dùng đường đồng mức thì nó không thể lệch — hình học
   *  là một, chỉ cách TÔ là hai. */
  levelLo: 0.2,
  levelHi: 0.6,
  /** Lớp bụi xa: dải rộng gấp bấy nhiêu, hai ngưỡng, độ mờ mỗi bậc. */
  dust: { spread: 2.2, levels: [0.24, 0.34, 0.44], opacity: 0.2 },
  /** Khe bụi tối: ba ngưỡng, độ mờ mỗi bậc. Nó NHÂN vào, không cộng. */
  lane: { levels: [0.3, 0.46, 0.6], opacity: 0.3 },
  /** Lưới lấy mẫu cho marching squares. 5 px/ô ở khung 1360 là đủ mềm cho một
   *  dải mây, và nó quyết dung lượng: ô nhỏ hơn là đường đồng mức dài hơn. */
  cell: 5,
  /** Giản lược Douglas–Peucker (§9.5: không giản lược là 534 KB dữ liệu đường). */
  simplify: 1.6,
  /** Lấm tấm trong lõi — thứ giữ cho năm bậc phẳng không đọc ra là năm mảng. */
  stipple: { count: 1700, size: 0.55, opacity: 0.22, at: 0.42, gain: 2.6 },
  /** Sợi sáng: ridged noise, chỉ giữ phần giá trị cao nhất. */
  filament: { count: 150, width: 0.5, opacity: 0.3, length: 26, keep: 0.12, at: 0.34 },
  /** Tinh vân cũng LOÃNG đi quanh một chòm, hệ số này × `SKY_FIELD.hullPad`.
   *  Nó không phải thẩm mỹ: nó là thứ giữ cho TRẦN ĐỘ CHÓI CỤC BỘ của §3.1
   *  (bao lồi nở 24 px không được sáng hơn `hullCeiling`) khỏi vỡ — dưới
   *  ngưỡng đó nét chòm mới đạt 3:1. Script tự đo và TRƯỢT nếu vỡ. */
  hullFade: { pad: 1.9, floor: 0.25 },
} as const;

/**
 * Bậc độ sáng (§6.1). `r = base × ratio^(5 − bậc)` — hàm MŨ, không tuyến tính,
 * vì bậc độ sáng vốn là thang log (tỉ số Pogson). Ngưỡng `minTests` là SỐ CA
 * CHẤM nhỏ nhất của bậc; script đếm từ giáo trình rồi tra bảng này.
 */
export const SKY_MAGNITUDE = {
  base: 2.2,
  ratio: 1.25,
  /** Sàn Stellarium: không bao giờ vẽ chấm nhỏ hơn 1,2 px; dưới mức đó giữ
   *  bán kính và hạ độ mờ theo (r/1,2)³. */
  floor: 1.2,
  tiers: [
    { tier: 1, minTests: 14, haloScale: 3.2, haloOpacity: 0.22 },
    { tier: 2, minTests: 11, haloScale: 3.0, haloOpacity: 0.19 },
    { tier: 3, minTests: 9, haloScale: 2.8, haloOpacity: 0.16 },
    { tier: 4, minTests: 8, haloScale: 2.6, haloOpacity: 0.13 },
    { tier: 5, minTests: 0, haloScale: 2.4, haloOpacity: 0.1 },
  ],
  /** Quầng dựng bằng VÒNG ĐỒNG TÂM, không bằng `radialGradient`.
   *
   *  Đặc tả §6.2 nói `radialGradient` với ba điểm dừng xấp xỉ 1/r. Ở đây đổi
   *  sang vòng đồng tâm có độ mờ ~1/r, vì hai lý do, lý do sau mới là chính:
   *   · luật của kho mã này là "sắc độ làm bằng mật độ nét" (`build_map.py`
   *     tự chặn nếu sinh ra chữ `gradient`);
   *   · và nhờ KHÔNG có gradient nào, ca test chặn được gradient TUYỆT ĐỐI —
   *     tức chặn luôn cái lỗi gốc mà cả bản vẽ này sinh ra để chữa: "mảng
   *     phẳng tô gradient". Một ngoại lệ cho quầng sao là một cái lỗ để thứ
   *     đó quay lại. */
  haloRings: 14,
  /** Hover: quầng đậm thêm bấy nhiêu (§10 hiệu ứng 4). Đây là thứ THAY cho
   *  "ngôi to thêm 0,6 px" — đổi kích thước là "chuyển động" theo định nghĩa
   *  hẹp của WCAG và phải bỏ dưới `prefers-reduced-motion`, nên bản này không
   *  làm nó ở đâu cả thay vì làm rồi phải sinh thêm một tấm thứ ba. */
  haloFocusBoost: 0.12,
  /** Lõi trắng: bán kính r × 0,40. Sao thật cháy trắng ở tâm và chỉ ánh màu ở
   *  rìa — và nó giữ cho tám sắc khoáng không biến 48 ngôi thành 48 chấm kẹo. */
  coreScale: 0.4,
  coreOpacity: 0.92,
} as const;

/** Nét nối trong một chòm (§4.1). */
export const SKY_LINK = {
  width: 1.15,
  opacity: 0.55,
  focusOpacity: 0.85,
  /** Nét DỪNG CÁCH TÂM SAO `r + gap`: quy ước bản đồ sao — nét nối không được
   *  chạm vào sao, nếu không sao thành một cái nút của nét thay vì một vật
   *  thể. Đây cũng là lý do bản vực cũ nhìn rối. */
  gap: 2.5,
  /** Rung tay ±0,9 px: nét thẳng tuyệt đối đọc ra "sơ đồ". */
  wobble: 0.9,
  /** Trần số nét cho MỘT chòm (§4.1): trên mức đó hình bắt đầu không nhớ
   *  được. Script TỰ CHẶN — đây là con số giữ cho cái chạc còn đọc ra là cái
   *  chạc chứ không thành một mớ gạch nối. */
  maxLines: 12,
  /** Nét ĐẬM HƠN của hàng/cột nhãn ở M6 (§2): chỗ DUY NHẤT trong cả bản đồ mà
   *  độ dày nét mang nghĩa riêng — nó nói ra khác biệt giữa `ndarray` (M5,
   *  không nhãn) và `DataFrame` (M6, có nhãn) bằng HÌNH chứ không bằng chữ.
   *  Phải có trong chú giải, không được để người xem đoán. */
  emphasis: 1.9,
  /** KHE NHỎ NHẤT giữa một ngôi của chòm này và một ngôi của chòm khác.
   *
   *  Đây là một ca chặn build, và nó có lý do cụ thể: bảng hộp §15 CHỒNG NHAU
   *  (M4 chiếm y 430–630, M2 chiếm y 600–780 và cả hai đụng nhau ở x 470–700;
   *  M4 và M6 chồng ở y 430–450). Đặt theo bảng đó thì PD07 của M6 và X03 của
   *  M4 cách nhau 21 px — hai ngôi của HAI chặng khác nhau đọc ra thành một
   *  cặp sao đôi. Hộp ở `SKY_<chòm>.box` đã dịch cho hết chồng; con số này là
   *  thứ giữ cho lần sau ai dịch lại cũng không dựng lại cái lỗi ấy. */
  minGap: 50,
} as const;

/** Nhãn — mọi con số của luật neo (§8.2 → §8.5). Không một giá trị nào ở đây
 *  được "đặt cho đẹp": script chấm điểm bốn hướng theo chúng, và **build
 *  TRƯỢT** nếu không tìm được chỗ. Đó là bản sửa thật cho lời chê "chữ hơi
 *  lệch" — bản cũ không có ai kiểm nên nhãn chồng nhau mà vẫn xuất ra file. */
export const SKY_LABEL = {
  /** Khe từ tâm ngôi neo tới đầu đường dẫn = r_sao + gap. */
  gap: 7,
  /** Đoạn xiên: ĐÚNG 30°, không 45°. 45° trùng đường chéo điểm ảnh (răng cưa
   *  đều đặn) và trùng góc mắt đọc ra "một mũi tên". */
  legAngle: 30,
  legMin: 34,
  legMax: 72,
  legStep: 2,
  /** Khi hết chỗ: nới đoạn xiên theo bước này tới `legHardMax`, rồi mới đổi
   *  sang ngôi sáng thứ nhì, rồi mới TRƯỢT (§8.4). */
  legGrow: 6,
  legHardMax: 96,
  elbow: 16,
  /** Gạch chân dài bằng bề rộng dòng tên + phần dư này. */
  rulePad: 6,
  ruleWidth: 0.8,
  textOffset: 6,
  baselineLift: 4,
  sublineGap: 19,
  leaderOpacity: 0.5,
  leaderFocusOpacity: 0.85,
  /**
   * HAI DÒNG, VÀ CHÚNG ĐÃ ĐỔI NGHĨA ngày 19/10/2026 — `nameSize`/`subSize`
   * giữ tên khoá cũ, nhưng đọc ở đây để không ai hiểu nhầm:
   *  · `name*` = dòng CHÍNH, **luôn hiện**: `M1 · Tiến trình` (mã chặng ·
   *    tên phần). Nó từng là tên chòm ("Kẹp", "Con thoi"…);
   *  · `sub*` = dòng PHỤ, **chỉ hiện lúc trỏ vào**: `Advanced Python · 7 bài`
   *    (tên khoá · số bài).
   *
   * Vì sao bỏ tên chòm khỏi nhãn (chủ sản phẩm chốt sau khi xem thật): học
   * viên tìm "chặng nào, học gì", và "Kẹp" không trả lời câu nào trong hai
   * câu đó — giữ nó là bắt mọi người học một hệ tên THỨ HAI mới dùng được
   * bản đồ. Hình chòm vẫn mang ẩn dụ (xem `name` của từng chòm); chỉ là chữ
   * không phải gánh thêm nó.
   *
   * HỘP VA CHẠM VẪN TÍNH CẢ DÒNG PHỤ, dù lúc nghỉ nó chưa hiện — một chỗ đặt
   * phải hợp lệ ở CẢ HAI trạng thái. Tính hộp theo trạng thái nghỉ thì lúc
   * trỏ vào, dòng phụ dài hơn dòng chính sẽ mọc ra ngoài hộp và rơi lên một
   * ngôi sao; mà nó chỉ rơi lúc hover nên không ai mở bản tĩnh ra thấy được.
   */
  nameSize: 20,
  nameWeight: 600,
  subSize: 15,
  subWeight: 500,
  subTracking: 0.04,
  /** Mã bài lúc hover (§10 hiệu ứng 7): JetBrains Mono 13px, chéo trên-phải. */
  codeSize: 13,
  codeOffset: 9,
  /** Hộp va chạm của nhãn = hộp chữ nở 10 px mọi phía; hộp không được giao
   *  bao lồi chòm nở 8 px, và không được đè một ngôi nở 6 px. */
  boxPad: 10,
  hullPad: 8,
  /** Khe nhỏ nhất giữa hộp chữ và một ngôi. Đặc tả §8.4 nói 6 px; ở đây 9.
   *
   *  Vì sao nới: với TÁM nhãn, chỗ đặt của M3 rơi đúng 6,2 px trên ngôi G01 —
   *  tức qua được luật 6 px với dư 0,2 px. Toạ độ trong SVG lại làm tròn về
   *  số nguyên (`nf()`), nên bức VẼ RA có khe 5,8 px và ca test đo trên tranh
   *  đỏ lên trong khi bộ đặt nhãn báo đạt. Nới khe KHÔNG tự nó chữa được
   *  chuyện làm tròn — bộ đặt nhãn chọn chỗ RẺ NHẤT còn hợp lệ nên nó luôn
   *  dừng đúng ở mép ràng buộc, mép nào cũng vậy; ca test vì thế trừ 1 px
   *  cho phép làm tròn, và nói ra điều đó ở chỗ nó trừ. Nới khe vẫn đáng
   *  làm vì một lý do khác: 6 px là khe mà mắt đọc ra "chữ dính vào sao". */
  starPad: 9,
  /** Quét tia kiểu Azgaar: mỗi 9°, chấm điểm ưu tiên tia gần phương ngang. */
  raySweep: 9,
  /** Trọng số chấm điểm bốn hướng. Ở Azgaar, che một BIỂU TƯỢNG đắt gấp ~3
   *  lần che một NHÃN khác (6 so với 2 trong mã nguồn họ), vì "giấu một biểu
   *  tượng là làm người đọc mất chính cái vật đó, không phải chỉ mất cái tên".
   *  Dịch thẳng sang đây: ngôi sao LÀ cái bài, cái tên chỉ là tên — nên
   *  `clear` (khe tới ngôi gần nhất) vào thẳng điểm, còn hai thứ còn lại là
   *  ưu tiên có trọng số. `wLeg` trừ dần để chọn đoạn dẫn NGẮN nhất còn đạt. */
  wAway: 26,
  wHoriz: 14,
  wLeg: 0.12,
  /** Chữ nằm trong một tài liệu SVG RIÊNG (ảnh vào trang bằng `<img>`), nên
   *  webfont của trang KHÔNG với tới được. Phải khai một chồng font hệ thống,
   *  và phải đo hộp va chạm theo một ước lượng RỘNG hơn Be Vietnam Pro thật —
   *  đo hẹp là tự cho phép nhãn chồng lên sao trên máy người khác. */
  fontStack: 'Be Vietnam Pro, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  monoStack: 'JetBrains Mono, Consolas, Menlo, monospace',
  /** Bề rộng một chữ cái tính theo cỡ chữ, dùng cho hộp va chạm. 0,62 là ước
   *  lượng RỘNG cho một font sans ở nét đậm 600 — cố ý rộng, xem trên. */
  advance: 0.62,
} as const;

/**
 * KẾT QUẢ đặt nhãn, ĐÃ ĐÓNG BĂNG. `SKY_LABEL` ở trên là *luật*; đây là *kết
 * quả* của bộ máy §8.4–§8.5 chạy trên luật đó.
 *
 * Vì sao phải đóng băng chứ không tính lại mỗi lần dựng (§19.5): với MỘT hồ sơ
 * thì tính lại không sao. Với HAI hồ sơ thì hai bản tự tính ra hai chỗ đặt
 * nhãn khác nhau, và kiểu hỏng là kiểu im lặng — không ai mở hai bản cạnh nhau
 * để so. Đặc tả §19.2 xếp "vị trí nhãn" vào danh sách 9 thứ phải GIỐNG HỆT,
 * sai số 0; cách duy nhất chắc chắn là cả hai đọc CÙNG một chỗ.
 *
 * Sinh lại bằng `py scripts/star/build_sky.py --place-nhan` rồi chép vào đây —
 * và mỗi lần dựng, script KIỂM LẠI khối này bằng đúng bộ điều kiện của §8.4
 * (tràn khung · cắt nét chòm · đè ngôi · giao bao lồi · độ chói hộp chữ). Nên
 * một khối cũ lại sai thì **build TRƯỢT**, không âm thầm đặt chữ chồng lên sao.
 *
 * `dir` là `[sx, sy]`: `sx` +1 nhãn ở bên phải ngôi neo, −1 bên trái; `sy` −1
 * đi lên, +1 đi xuống. `leg` là độ dài đoạn xiên 30° (px).
 *
 * THỨ TỰ CÁC DÒNG LÀ THỨ TỰ NHƯỜNG, không phải M1…M8 — và nó mang tin, đừng
 * sắp lại cho gọn mắt. §8.4: chòm có ngôi neo SÁNG NHẤT đặt trước và GIỮ CHỖ,
 * chòm tới sau phải tránh mọi hộp đã giữ. Đọc được ngay trong khối này: M8
 * (DA01 · 19 ca) và M3 (R02 · 17 ca) đi trước, còn M1 — tới thứ ba — phải
 * nới đoạn dẫn tới **90 px**, gần gấp ba đoạn 34 px mà M2, M5 và M6 lấy
 * được.
 *
 * Ba chỗ đáng biết, cả ba là bộ máy §8.4 đang làm việc chứ không phải lỗi:
 *  · M3 neo vào **G05**, không vào R02 — R02 là ngôi sáng nhất chòm nhưng nó
 *    ở TÂM một hình kín, nên mọi đường dẫn từ đó đều cắt qua nét của chính
 *    chòm. Bộ máy thử ngôi sáng thứ nhì đúng như §8.4 bước 2 nói.
 *  · M5 neo vào **N04**, ngôi thứ BA của nó. N01 và N02 đều ở nửa trái cái
 *    lưới, mà bên trái chúng chỉ còn 176 px tới mép khung — hẹp hơn hộp chữ;
 *    còn phía trên thì mạch hoàng đạo chạy ngang. Đây là ca buộc bộ máy phải
 *    thử tới ngôi neo thứ ba thay vì thứ hai như §8.4 viết.
 *  · M1 có đoạn dẫn **90 px** — dài gần gấp ba M2 — vì nó tới sau M3 và M8,
 *    và phải đi ra khỏi vùng hai chòm kia đã giữ. Đó chính là cái giá của
 *    luật nhường, nhìn thấy được bằng một con số.
 *
 * CHẠY LẠI 19/10/2026 sau khi nhãn bỏ tên chòm và ngắn lại còn một dòng, và
 * khối ra ĐÚNG NHƯ CŨ — tám hàng không đổi một con số. Ghi lại vì một khối
 * không đổi dễ bị đọc thành "người ta quên chạy lại": hộp chữ thì có đổi (bề
 * rộng của năm trong tám chòm, vì nay nó là `max` của dòng chặng ở cỡ 20 và
 * dòng khoá ở cỡ 15), nhưng chỗ đặt RẺ NHẤT CÒN HỢP LỆ vẫn là chỗ cũ. Vùng
 * bấm `.hit*b` thì đổi theo và đã sinh lại.
 */
export const SKY_LABEL_PLACED = [
  { key: 'M3', anchor: 'G05', dir: [-1, -1], leg: 54 },
  { key: 'M8', anchor: 'DA01', dir: [-1, -1], leg: 34 },
  { key: 'M1', anchor: 'P05', dir: [1, -1], leg: 90 },
  { key: 'M2', anchor: 'T05', dir: [1, -1], leg: 34 },
  { key: 'M4', anchor: 'X02', dir: [1, -1], leg: 36 },
  { key: 'M5', anchor: 'N04', dir: [1, 1], leg: 34 },
  { key: 'M7', anchor: 'M01', dir: [1, 1], leg: 48 },
  { key: 'M6', anchor: 'PD01', dir: [-1, -1], leg: 68 },
] as const;

/**
 * TÊN KHOÁ, cho dòng phụ hiện lúc trỏ vào (`Advanced Python · 7 bài`).
 *
 * Ở đây chứ không ở `build_sky.py`: luật 1 của tệp này là "hình thái và câu
 * chữ ở TS, bộ sinh không biết gì". Và phải KHỚP `COURSES` trong
 * `src/lib/catalog.ts` — một ca test so hai chỗ, vì tên khoá đã từng đổi một
 * lần (`scripts/rename-python-advanced.ts`) và lần đó phải sửa ba chỗ; bản đồ
 * sao là chỗ thứ tư. Một tên chép tay là một tên sẽ lệch.
 */
export const SKY_COURSE = { name: 'Advanced Python' } as const;

/** Vùng bấm (§4.4 · §10): bao lồi của chòm nở ra bấy nhiêu, CỘNG hộp nhãn.
 *  Không phải một ô chia hết bầu trời — khoảng tối giữa hai chòm không thuộc
 *  về ai (đặc tả chọn quy ước Bayer, không chọn IAU). */
export const SKY_HIT = { hullPad: 20 } as const;

/**
 * Một bậc mật độ chấm của bản SÁNG (đặc tả §18.2): giữa hai đường đồng mức
 * `f`, rải chấm `r` ở mật độ `density` bằng nhiễu xanh. Bản TỐI khai `null`.
 */
export type SkyStippleStep = { f: number; density: number; r: number; tone: string };

/**
 * Một profile = bảng màu CỘNG cơ chế tô.
 *
 * Vì sao không chỉ là màu (§19.3): bản sáng đổi **tín hiệu chiều sâu gánh
 * chính** từ ĐỘ CHÓI sang MẬT ĐỘ — tức nó đổi cơ chế, không đổi mã màu. Nếu
 * những khoá dưới đây không có ở đây thì `build_sky.py` sẽ phải mọc ra một
 * nhánh `if profile == 'light'`, và nhánh `if` theo TÊN hồ sơ là đúng chỗ hai
 * bản trôi xa nhau mà không ai thấy. Nên bản tối khai `null`/giá trị hiện tại
 * cho những khoá chỉ bản sáng dùng, và bộ sinh chỉ đọc KHOÁ, không đọc tên.
 */
export type SkyProfile = {
  /** Tín hiệu chiều sâu gánh chính. `stipple` là bản sáng (§18.2) và bộ sinh
   *  hiện CHƯA dựng nó — nó trượt build với một câu nói rõ, không âm thầm vẽ
   *  bản tối ra tệp mang tên bản sáng. */
  render: 'luminance' | 'stipple';
  /** Sáu bậc mật độ chấm của bản sáng; bản tối `null` vì nó tô bằng năm lớp
   *  phủ chồng ở độ mờ 0,15 (§9.5) chứ không bằng mật độ. */
  stipple: SkyStippleStep[] | null;
  /** Quầng: `glow` toả ra (bản tối) hay `clearing` — một VÙNG BỎ CHẤM quanh
   *  ngôi (bản sáng, §18.3). Cùng dải bán kính ở cả hai bản. */
  halo: { kind: 'glow' } | { kind: 'clearing'; jitter: number };
  /** Nhánh nào của `MAP_PALETTE.mN` tám sắc chặng lấy từ: `glow` (đặt được
   *  trên nền tối) hay `ink` (đặt được trên nền sáng). */
  hueBranch: 'glow' | 'ink';
  /** Hệ số theo hồ sơ. ĐÂY là chỗ duy nhất bán kính/độ dày/độ mờ được phép
   *  khác nhau giữa hai bản — bảng §19.3, không thêm dòng nào. */
  scale: {
    /** Bán kính 48 ngôi: 1,00 (tối) · 1,08 (sáng). */
    star: number;
    /** Bề rộng nét chòm: 1,15 px (tối) · 1,00 px (sáng). */
    line: number;
    /** [nghỉ, hover] của nét chòm. */
    lineOpacity: [number, number];
    /** Nét của BẢY CHÒM CÒN LẠI khi một chòm được trỏ vào: 0,55 → 0,28
     *  (§10 hiệu ứng 3). Tách hình khỏi nền bằng TƯƠNG PHẢN, không bằng
     *  chuyển động. */
    dimOpacity: number;
    /** Hệ số mờ cho các lớp TRỜI (tinh vân, sao nền, lưới) lúc hover.
     *
     *  Một dòng THÊM so với bảng §19.3, và lý do phải viết ra: bản mẫu chỉ có
     *  MỘT chòm, nên "các vùng khác" ở đây là chính bầu trời, không phải bảy
     *  chòm kia. Dùng thẳng `dimOpacity` 0,28 cho trời thì tinh vân (vốn đã ở
     *  độ mờ 0,15 mỗi bậc) tắt hẳn — mất đúng thứ mà hover phải để người xem
     *  còn nhìn xuyên qua được (quy ước Bayer, §10 hiệu ứng 2). */
    skyDim: number;
    /** Độ mờ của hình khắc dụng cụ lúc hover (lớp E — chưa dựng ở bản mẫu). */
    figureOpacity: number;
  };
  /** Nền tuyệt đối. */
  base: string;
  /** Sáu lớp tinh vân, từ xa về gần (§3.1). */
  dustFar: string;
  nebula: string;
  nebulaCore: string;
  dustLane: string;
  filament: string;
  horizon: string;
  /** Nguồn sáng trội (`SKY_LIGHT`): sắc của quầng và của lõi cháy.
   *
   *  Khoá `ceiling` ĐÃ BỊ BỎ ở đây, và nói ra chứ đừng để ai dựng lại: nó là
   *  trần độ chói TOÀN CỤC của §3.1, và nó chính là thứ ép dải độ chói của cả
   *  bức lại (`chieu-sau-tuong-tac.md` §2.4). Thay nó là `SKY_BUDGET` — một
   *  ngân sách theo DIỆN TÍCH, không phải một trần theo ĐIỂM. Hai trần CỤC BỘ
   *  (`hullCeiling`, `textCeiling`) thì giữ nguyên: chúng là ràng buộc tiếp
   *  cận ở đúng chỗ có nét mang tin và có chữ. */
  glow: string;
  glowCore: string;
  /** Trần độ chói CỤC BỘ trong bao lồi mỗi chòm — dưới ngưỡng này nét chòm
   *  mới đạt 3:1. */
  hullCeiling: string;
  /** Trần độ chói của chỗ ĐẶT HỘP CHỮ: dòng phụ `textSub` chỉ còn 4,42:1 ở
   *  chỗ sáng nhất, tức DƯỚI 4,5:1 (§5.2). Script tự đo trong hộp chữ và loại
   *  hướng nào vượt — và nếu không hướng nào đạt thì **build TRƯỢT**. */
  textCeiling: string;
  /** Sao nền: trung tính LẠNH, không sắc — hàng rào 2 của §7.2. */
  field: string;
  /** Lõi sao. `#FFFFFF` chỉ được dùng ở ĐÚNG chỗ này trong cả bản đồ: nhờ thế
   *  trắng tinh thành một giá trị MANG NGHĨA. Chữ dùng `text`, không dùng
   *  trắng tuyệt đối. Bản SÁNG không có lõi (§18.3) ⇒ `null`. */
  core: string | null;
  grid: string;
  /** Mạch phụ thuộc (§4.2). SẮC RIÊNG, không chia với nét chòm: luật rút từ
   *  Stellarium — nó dành `#CC4C4C` riêng cho đường ranh giới, khác hẳn sắc
   *  nét chòm. Mỗi LOẠI nét một sắc, không chia sắc giữa hai loại, nếu không
   *  ba lớp liên kết của §4 không phân biệt được bằng mắt. */
  zodiac: string;
  text: string;
  textSub: string;
  code: string;
  /** Tám sắc khoáng của tám chặng (§5.1). Chúng đạt 4,5:1 trên MỌI nền có thể
   *  có trong bản đồ, kể cả chỗ tinh vân sáng nhất; sắc thấp nhất là m1 ở
   *  4,53 — đó chính là lý do có trần độ chói ở trên. */
  hues: { m1: string; m2: string; m3: string; m4: string; m5: string; m6: string; m7: string; m8: string };
};

/**
 * Bản TỐI. Đặc tả §5.1: bầu trời dùng token giao diện ở chế độ tối, vì
 * `--ds-page` bản tối đã là `#0B1220` — gần đúng màu cần. Lấy token thay vì
 * tránh token làm bản đồ THUỘC VỀ sản phẩm thay vì dán lên sản phẩm.
 */
/** Exported chứ không phải `const DARK` nội bộ: `build_sky.py` tra đúng tên
 *  `SKY_PROFILE_<TÊN>` và đọc literal này. Gói nó vào `SKY_PROFILES` rồi mới
 *  đọc thì bộ phân tích literal thô của Python gặp `{ dark: DARK }` — một tham
 *  chiếu, không phải dữ liệu — và phải đi tìm tiếp. */
export const SKY_PROFILE_DARK: SkyProfile = {
  render: 'luminance',
  stipple: null,
  halo: { kind: 'glow' },
  hueBranch: 'glow',
  scale: {
    star: 1.0,
    line: 1.15,
    lineOpacity: [0.55, 0.85],
    dimOpacity: 0.28,
    skyDim: 0.62,
    figureOpacity: 0.13,
  },
  base: '#0A0C14',
  dustFar: '#1A1E2E',
  nebula: '#272D42',
  nebulaCore: '#434559',
  dustLane: '#0D101C',
  filament: '#4A4A6E',
  horizon: '#2A2416',
  glow: '#4E5468',
  glowCore: '#F6F1E2',
  hullCeiling: '#232C4A',
  textCeiling: '#2F3B63',
  field: '#C6D2E8',
  core: '#FFFFFF',
  grid: '#5A6B93',
  zodiac: '#B9D0FF',
  text: '#E8EEF7',
  textSub: '#AFBDD2',
  code: '#C9A646',
  /** Tám sắc khoáng. m1 và m2 ĐÃ HẠ BÃO HOÀ ngày 19/10/2026, và đây là một
   *  số đo chứ không phải một gu: `chieu-sau-tuong-tac.md` §2.3 đo m1
   *  `#F0B35A` ra bão hoà HSV **0,625**, trong khi cả khung hình tham chiếu
   *  trung bình **0,196** — tức một sắc của mình no hơn 90% khung hình ấy.
   *  Màu no là một trong những dấu hiệu "máy vẽ" rõ nhất.
   *
   *  Đo lại cả tám thì chỉ m1 (0,625) và m2 (0,476) cao; sáu sắc còn lại
   *  0,084–0,256. Nên hạ đúng hai sắc đó: m1 → 0,379, m2 → 0,339, và trung
   *  bình tám sắc đi từ 0,252 xuống **0,204** — ngang 0,196 của tham chiếu.
   *
   *  KHÔNG hạ tới 0,196 cho từng sắc, và lý do là một ràng buộc chứ không
   *  phải sự dè dặt: m1 (33°) và m2 (45°) chỉ cách nhau 12° sắc độ, hạ bão
   *  hoà cả hai xuống 0,2 thì chúng thành một màu — mà M1 và M2 nằm KỀ NHAU ở
   *  dải chân trời. Một bản đồ mà hai chặng cạnh nhau cùng màu là một bản đồ
   *  nói sai. Nên m2 cũng được nới sắc độ sang 52° (vàng-lục hơn) để giữ
   *  khoảng cách khi cả hai đã nhạt đi. */
  hues: {
    m1: '#F0C795',
    m2: '#E3D996',
    m3: '#CFE3EA',
    m4: '#9ACFC3',
    m5: '#D7D0EE',
    m6: '#E4EDC6',
    m7: '#ECC4DC',
    m8: '#FBF6E6',
  },
};

/**
 * Hai bản, một bộ sinh. `light` CHƯA CÓ — nó là một ô trống có kiểu sẵn, không
 * phải một thứ phải viết lại `build_sky.py` mới thêm được: script nhận
 * `--profile <tên>`, tra `SKY_PROFILE_<TÊN>`, và không có một nhánh `if` nào
 * theo tên hồ sơ.
 *
 * **BẢN ĐỒ ĐỔI THEO CHẾ ĐỘ CỦA TRANG.** Chủ sản phẩm đã chốt thế ngày
 * 19/10/2026 (đặc tả §5.3 và §16 quyết định 3). Một chú thích ở đây từng ghi
 * ngược lại — "bản đồ LUÔN tối ở cả hai chế độ giao diện" — và nó được ghi ra
 * đây để không ai dựng lại cái câu đó: một chú thích tự tin mà sai đắt hơn
 * không có chú thích.
 */
export const SKY_PROFILES: { dark: SkyProfile; light?: SkyProfile } = { dark: SKY_PROFILE_DARK };

/** Một ngôi mang nghĩa = một bài. Toạ độ ở lưới CỤC BỘ của chòm. */
export type SkyStar = { code: string; x: number; y: number; role: string };

/**
 * Một chòm. `box` là hộp của nó trong khung 1360 × 820 (§15), `grid` là lưới
 * CỤC BỘ mà toạ độ sao của nó cho theo, y đi XUỐNG.
 *
 * VÌ SAO `grid` LÀ CỦA TỪNG CHÒM, không phải một hằng dùng chung: bảng §2 cho
 * M2…M8 toạ độ y trong 0…100, còn bảng M1 của chính nó có y tới 195. Bản mẫu
 * một chòm giải bằng một lưới 100 × 200 dùng chung, và với một chòm thì không
 * sao. Với tám thì nó sai hẳn: `min(300/100, 180/200)` = 0,9 nên M2 co lại còn
 * 90 × 90 đơn vị, dán vào nửa TRÊN của một hộp 300 × 180 và chừa trống nửa
 * dưới. Khai lưới thật của từng chòm là chỗ duy nhất giữ được cả hai: tỉ lệ
 * ĐỒNG DẠNG (hình không bè ra) và hộp được lấp (chòm không teo lại).
 */
export type SkyConstellation = {
  key: string;
  hue: keyof SkyProfile['hues'];
  /**
   * TÊN HÌNH — ẩn dụ của hình chòm ("Kẹp", "Con thoi", "Lưới trần"…).
   *
   * **KHÔNG BAO GIỜ in lên nhãn.** Chủ sản phẩm bỏ nó khỏi nhãn ngày
   * 19/10/2026: học viên tìm "chặng nào, học gì", và "Kẹp" không trả lời câu
   * nào trong hai câu đó. Nó còn ở đây vì nó là một LỜI KHẲNG ĐỊNH VỀ HÌNH mà
   * ca test đo lại được — ca `hình M1 "Kẹp"` kiểm rằng hình thật có một cán,
   * hai càng rời nhau rồi gặp lại; đổi hình mà quên đổi tên là một ca đỏ. Nên
   * nó là tài liệu có người canh, không phải chữ hiển thị.
   *
   * Hệ quả cho câu chữ ở chỗ khác: chú giải KHÔNG được gọi một chòm bằng tên
   * hình nữa (nó từng viết 'chòm "Bàn có nhãn"'), vì cái tên ấy không còn ở
   * đâu trên bản đồ để người đọc tìm ra. Gọi bằng MÃ CHẶNG.
   */
  name: string;
  /** Tên phần. Dòng CHÍNH của nhãn là `M1 · <subtitle>`, và dòng PHỤ hiện lúc
   *  trỏ vào là `<tên khoá> · <số ngôi> bài` — SỐ BÀI đếm từ `stars`, không
   *  viết cứng, nên nó không nói sai được. */
  subtitle: string;
  box: readonly [number, number, number, number];
  grid: readonly [number, number];
  stars: readonly SkyStar[];
  /** `[a, b]` hoặc `[a, b, 'dam']` — `dam` là nét ĐẬM HƠN của hàng/cột nhãn ở
   *  M6 (§2), chỗ duy nhất độ dày nét mang nghĩa riêng. */
  lines: readonly (readonly [string, string] | readonly [string, string, 'dam'])[];
};

/**
 * M1 · KẸP — Tiến trình và subprocess, 7 bài (§2).
 *
 * TÊN ĐÃ ĐỔI ngày 19/10/2026, và đổi TÊN chứ không đổi HÌNH. Người dựng bản
 * mẫu gọi chòm này là "Chạc" theo đặc tả §2, rồi tự kết luận là hình không đọc
 * ra được cái chạc: nhánh của một cái chạc KHÔNG gặp lại nhau, mà ở đây hai
 * nhánh chụm lại ở P07 nên trên cán mọc ra một VÒNG KÍN. Hình thì đúng — thứ
 * phải đọc ra là ngữ nghĩa `fork()` rồi `wait()`, và một vòng kín trên cán là
 * đúng thứ đó. Sai là cái tên.
 *
 * "Kẹp" đọc đúng hình: một cái kẹp (kẹp gắp, kẹp lò) nhìn chính diện lúc khép
 * là MỘT cán ở dưới (hai lá ép vào nhau nên mắt đọc ra một nét), hai càng bung
 * ra, rồi hai mũi gặp nhau ở đỉnh. Đúng ba đoạn của hình này, theo đúng thứ tự
 * ấy.
 *
 * Và nó đọc đúng cả NGHĨA, chứ không chỉ đúng đường nét: một cái kẹp có HAI
 * càng nhưng là MỘT vật — đúng như hai tiến trình sau một `fork()` là hai
 * luồng thi hành của một chương trình. Cái chạc thì mỗi nhánh đi một đường và
 * không bao giờ quay lại.
 *
 * Nó cũng ở đúng trong quy ước mà §1 dựa vào: Lacaille đã treo *Fornax*, cái
 * lò, lên trời nam bán cầu năm 1751 — cái kẹp là dụng cụ người ta dùng để gắp
 * thứ ra khỏi chính cái lò ấy. Dụng cụ trên bàn người thợ, không phải một vật
 * đi mượn.
 *
 * Hai nhánh không chia tuỳ tiện: nhánh TRÁI là việc hệ điều hành làm (lập
 * lịch, ống dẫn), nhánh PHẢI là việc Python gọi (`run`, `Popen`). Chúng gặp
 * nhau ở `multiprocessing`, nơi hai thứ đó là một.
 *
 * Bảy nét cho bảy ngôi — dưới trần 12 nét của §4.1 ("trên mức đó hình bắt đầu
 * không nhớ được"). Nối theo HÌNH, không theo thứ tự bài; ở M1 hai thứ trùng
 * nhau trên từng nhánh và chỉ nhảy ở chỗ đổi nhánh, mà chỗ đổi nhánh là một
 * ranh giới nội dung thật.
 */
export const SKY_M1: SkyConstellation = {
  key: 'M1',
  hue: 'm1',
  name: 'Kẹp',
  subtitle: 'Tiến trình',
  box: [90, 585, 310, 210],
  grid: [100, 200],
  stars: [
    { code: 'P01', x: 50, y: 195, role: 'gốc cán' },
    { code: 'P02', x: 50, y: 140, role: 'chỗ rẽ' },
    { code: 'P03', x: 22, y: 100, role: 'càng trái' },
    { code: 'P04', x: 12, y: 48, role: 'càng trái' },
    { code: 'P05', x: 78, y: 100, role: 'càng phải' },
    { code: 'P06', x: 88, y: 48, role: 'càng phải' },
    { code: 'P07', x: 50, y: 18, role: 'chỗ chụm' },
  ],
  lines: [
    ['P01', 'P02'],
    ['P02', 'P03'],
    ['P03', 'P04'],
    ['P04', 'P07'],
    ['P02', 'P05'],
    ['P05', 'P06'],
    ['P06', 'P07'],
  ],
};

/**
 * M2 · CON THOI — Đa luồng, 6 bài (§2).
 *
 * Hình: một thấu kính nhọn hai đầu — con thoi của khung cửi. `thread` nghĩa
 * đen là SỢI, và vật dùng để đưa sợi qua khung cửi là con thoi. Nhưng hình
 * không dừng ở chữ: hai cung RỜI NHAU ở một mũi và GẶP LẠI ở mũi kia — đó
 * đúng là `start()` … `join()`, và khoảng phình giữa hai cung là quãng hai
 * luồng cùng chạy.
 *
 * Cung TRÊN là cách tạo một luồng (target/start/join, subclass); cung DƯỚI là
 * cái hỏng khi có hai luồng (GIL, lock/race). T05 là ngôi sáng nhất chòm (13
 * ca chấm, bậc 2) vì nó là bài nặng nhất — đúng chỗ đáng sáng, và không ai
 * chọn cho nó sáng: số ca chấm nói thế.
 */
export const SKY_M2: SkyConstellation = {
  key: 'M2',
  hue: 'm2',
  name: 'Con thoi',
  subtitle: 'Đa luồng',
  box: [370, 655, 300, 150],
  grid: [100, 100],
  stars: [
    { code: 'T01', x: 6, y: 50, role: 'mũi trái — chỗ tách' },
    { code: 'T02', x: 30, y: 16, role: 'cung trên' },
    { code: 'T03', x: 62, y: 12, role: 'cung trên' },
    { code: 'T04', x: 34, y: 86, role: 'cung dưới' },
    { code: 'T05', x: 66, y: 90, role: 'cung dưới' },
    { code: 'T06', x: 94, y: 50, role: 'mũi phải — chỗ gặp' },
  ],
  lines: [
    ['T01', 'T02'],
    ['T02', 'T03'],
    ['T03', 'T06'],
    ['T01', 'T04'],
    ['T04', 'T05'],
    ['T05', 'T06'],
  ],
};

/**
 * M3 · KHUNG CỬA — GUI Tkinter và dự án, 7 bài (§2).
 *
 * Hình: một khung cửa sổ có một thanh đứng chia đôi. GUI là cái khung ta nhìn
 * qua. Thanh đứng không phải trang trí: G05 đúng là bài "OOP và tách logic
 * khỏi giao diện", nên nó đứng ở ĐẦU thanh chia — cái thanh ấy LÀ sự tách đó.
 *
 * R02 ở tâm, nơi thanh chia cắt qua: dự án là chỗ mọi mảnh gặp nhau. Nó là
 * bài cửa (`step_4.gate`) và có 17 ca chấm — bậc 1, sáng nhất chòm, không phải
 * vì ta muốn thế mà vì dữ liệu nói thế.
 */
export const SKY_M3: SkyConstellation = {
  key: 'M3',
  hue: 'm3',
  name: 'Khung cửa',
  subtitle: 'GUI Tkinter',
  box: [900, 575, 300, 240],
  grid: [100, 100],
  stars: [
    { code: 'G01', x: 8, y: 8, role: 'góc trên-trái' },
    { code: 'G02', x: 92, y: 8, role: 'góc trên-phải' },
    { code: 'G03', x: 92, y: 92, role: 'góc dưới-phải' },
    { code: 'G04', x: 8, y: 92, role: 'góc dưới-trái' },
    { code: 'G05', x: 50, y: 8, role: 'đầu thanh chia' },
    { code: 'G06', x: 50, y: 92, role: 'chân thanh chia' },
    { code: 'R02', x: 50, y: 50, role: 'tâm — bài cửa' },
  ],
  lines: [
    ['G01', 'G05'],
    ['G05', 'G02'],
    ['G02', 'G03'],
    ['G03', 'G06'],
    ['G06', 'G04'],
    ['G04', 'G01'],
    ['G05', 'R02'],
    ['R02', 'G06'],
  ],
};

/**
 * M4 · PHỄU — Nhập dữ liệu, SQL và tra cứu, 5 bài (§2).
 *
 * Hình: ba miệng chụm vào một cổ, rồi một vòi. Cả chặng là "dữ liệu từ nhiều
 * nơi đổ về một chỗ rồi ra thành hình". Và nó là hình NGHỊCH ĐẢO của M1: M1
 * tách ra, M4 gộp vào — hai chòm đối nhau qua bầu trời là một quan hệ mắt đọc
 * được mà không cần chú thích.
 *
 * Nó nằm TRONG vùng dày sao nhất của Ngân Hà, và đó là vị trí mang nghĩa
 * (§4.3 điểm 4): chặng "dữ liệu từ khắp nơi đổ về" đứng đúng chỗ trời dày
 * nhất.
 */
export const SKY_M4: SkyConstellation = {
  key: 'M4',
  hue: 'm4',
  name: 'Phễu',
  subtitle: 'Nhập dữ liệu và SQL',
  box: [495, 470, 240, 165],
  grid: [100, 100],
  stars: [
    { code: 'X01', x: 12, y: 10, role: 'miệng trái' },
    { code: 'X02', x: 50, y: 4, role: 'miệng giữa' },
    { code: 'X03', x: 88, y: 10, role: 'miệng phải' },
    { code: 'X04', x: 50, y: 58, role: 'cổ phễu' },
    { code: 'X05', x: 50, y: 94, role: 'vòi — thứ chảy ra' },
  ],
  lines: [
    ['X01', 'X04'],
    ['X02', 'X04'],
    ['X03', 'X04'],
    ['X04', 'X05'],
  ],
};

/**
 * M5 · LƯỚI TRẦN — NumPy, 6 bài (§2).
 *
 * Hình: lưới 2 × 3, ô đều nhau, KHÔNG nhãn. Phải đọc cùng M6, vì khác biệt
 * giữa hai chòm chính là khác biệt giữa `ndarray` và `DataFrame`: một cái có
 * nhãn, một cái không. Đó là câu trả lời ngắn nhất cho "pandas khác NumPy chỗ
 * nào", và nó được nói bằng HÌNH, không bằng chữ.
 *
 * Hệ quả cho người dựng: ở M5 KHÔNG nét nào được đậm hơn nét nào. Một nét đậm
 * ở đây là một cái nhãn, tức là xoá mất chính câu nói trên.
 */
export const SKY_M5: SkyConstellation = {
  key: 'M5',
  hue: 'm5',
  name: 'Lưới trần',
  subtitle: 'NumPy',
  box: [90, 285, 330, 180],
  grid: [100, 100],
  stars: [
    { code: 'N01', x: 6, y: 18, role: 'ô 1-1' },
    { code: 'N02', x: 50, y: 12, role: 'ô 1-2' },
    { code: 'N03', x: 94, y: 6, role: 'ô 1-3' },
    { code: 'N04', x: 10, y: 88, role: 'ô 2-1' },
    { code: 'N05', x: 54, y: 82, role: 'ô 2-2' },
    { code: 'N06', x: 98, y: 76, role: 'ô 2-3' },
  ],
  lines: [
    ['N01', 'N02'],
    ['N02', 'N03'],
    ['N04', 'N05'],
    ['N05', 'N06'],
    ['N01', 'N04'],
    ['N02', 'N05'],
    ['N03', 'N06'],
  ],
};

/**
 * M6 · BÀN CÓ NHÃN — pandas, 9 bài (§2).
 *
 * Hình: bàn 3 × 3 — hàng trên là tên cột, cột trái là index, bốn ô trong là
 * thân bảng. PD01 ở ô GÓC, nơi index gặp columns.
 *
 * PD07 (pivot/melt — bài đổi hình bảng) nằm trên CỘT NHÃN, vì pivot/melt chính
 * là việc đổi cái gì làm nhãn. PD04 (lọc, tính cột) cũng ở cột nhãn vì nó chọn
 * hàng theo nhãn.
 *
 * Bốn nét `dam` là hàng nhãn trên và cột nhãn trái. Đây là chỗ DUY NHẤT trong
 * cả bản đồ mà độ dày nét mang nghĩa riêng, nên nó phải có trong chú giải —
 * không được để người xem đoán.
 */
export const SKY_M6: SkyConstellation = {
  key: 'M6',
  hue: 'm6',
  name: 'Bàn có nhãn',
  subtitle: 'pandas',
  box: [520, 230, 360, 200],
  grid: [100, 100],
  stars: [
    { code: 'PD01', x: 8, y: 8, role: 'ô góc — index gặp columns' },
    { code: 'PD02', x: 46, y: 4, role: 'hàng nhãn trên' },
    { code: 'PD03', x: 84, y: 0, role: 'hàng nhãn trên' },
    { code: 'PD04', x: 12, y: 50, role: 'cột nhãn trái' },
    { code: 'PD05', x: 50, y: 46, role: 'thân' },
    { code: 'PD06', x: 88, y: 42, role: 'thân' },
    { code: 'PD07', x: 16, y: 92, role: 'cột nhãn trái' },
    { code: 'PD08', x: 54, y: 88, role: 'thân' },
    { code: 'PD09', x: 92, y: 84, role: 'thân' },
  ],
  lines: [
    ['PD01', 'PD02', 'dam'],
    ['PD02', 'PD03', 'dam'],
    ['PD01', 'PD04', 'dam'],
    ['PD04', 'PD07', 'dam'],
    ['PD04', 'PD05'],
    ['PD05', 'PD06'],
    ['PD07', 'PD08'],
    ['PD08', 'PD09'],
    ['PD02', 'PD05'],
    ['PD05', 'PD08'],
    ['PD03', 'PD06'],
    ['PD06', 'PD09'],
  ],
};

/**
 * M7 · TRỤC VÀ ĐƯỜNG — Matplotlib, 6 bài (§2).
 *
 * Hình: hai trục vuông góc, và một đường đi lên từ gốc. M05 ở ĐẦU TRỤC NGANG
 * vì nó đúng là bài về cái trục ấy (ticks, scale, ngày trên trục); M03 ở đỉnh
 * trục đứng vì subplot là xếp chồng theo chiều đứng.
 */
export const SKY_M7: SkyConstellation = {
  key: 'M7',
  hue: 'm7',
  name: 'Trục và đường',
  subtitle: 'Matplotlib',
  box: [955, 195, 320, 195],
  grid: [100, 100],
  stars: [
    { code: 'M01', x: 8, y: 92, role: 'gốc toạ độ' },
    { code: 'M02', x: 30, y: 66, role: 'đường dữ liệu' },
    { code: 'M03', x: 8, y: 10, role: 'đỉnh trục đứng' },
    { code: 'M04', x: 58, y: 44, role: 'đường dữ liệu' },
    { code: 'M05', x: 96, y: 92, role: 'đầu trục ngang' },
    { code: 'M06', x: 86, y: 18, role: 'đường dữ liệu' },
  ],
  lines: [
    ['M01', 'M03'],
    ['M01', 'M05'],
    ['M01', 'M02'],
    ['M02', 'M04'],
    ['M04', 'M06'],
  ],
};

/**
 * M8 · SONG TINH — Dự án DA, 2 bài (§2).
 *
 * Hai bài. Không vẽ được "hình" gì từ hai điểm, và đừng cố: ép hai điểm thành
 * một hình là đúng loại bịa mà đặc tả cấm. Thay vào đó dùng đúng thứ bầu trời
 * thật có — SAO ĐÔI: hai ngôi gần nhau, sáng nhất bản đồ.
 *
 * Đặt ở THIÊN ĐỈNH — chỗ cao nhất, trời tối nhất và trong nhất, không tinh vân
 * nào chắn. Không phải vì "khó nhất" mà vì đó là chỗ nhìn rõ nhất: bản quyết
 * định cũ đã chốt "đáy sáng lại — bỏ cái nghĩa càng sâu càng nguy hiểm", và
 * trên trời điều đó thành "đỉnh là chỗ quang nhất".
 *
 * Cả hai là bài cửa (`step_4.gate`) và cùng bậc 1 (19 và 14 ca chấm).
 */
export const SKY_M8: SkyConstellation = {
  key: 'M8',
  hue: 'm8',
  name: 'Song tinh',
  subtitle: 'Dự án DA',
  box: [1055, 60, 200, 110],
  grid: [100, 100],
  stars: [
    { code: 'DA01', x: 26, y: 50, role: 'ngôi thứ nhất' },
    { code: 'DA02', x: 74, y: 50, role: 'ngôi thứ hai' },
  ],
  lines: [['DA01', 'DA02']],
};

/**
 * Khoá tám chòm, theo thứ tự chặng.
 *
 * Mảng này là thứ `build_sky.py` đọc, rồi với mỗi khoá nó tra hằng `SKY_<khoá>`
 * — nên thêm một chòm là thêm một hằng VÀ một khoá ở đây, không phải sửa
 * Python. `SKY_CONSTELLATIONS` dưới đây phải khớp mảng này; ca test so lại, vì
 * TypeScript không dựng được danh sách kia từ danh sách này.
 */
export const SKY_CONSTELLATION_KEYS = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8'] as const;

/** Tám chòm, cho phía React/test dùng. */
export const SKY_CONSTELLATIONS: readonly SkyConstellation[] = [
  SKY_M1, SKY_M2, SKY_M3, SKY_M4, SKY_M5, SKY_M6, SKY_M7, SKY_M8,
];

/**
 * THỨ TỰ LỚP LÀ MỘT DANH SÁCH DUY NHẤT (§9.1).
 *
 * Luật này lấy từ bản mổ xẻ hậu sự của Azgaar về chính lỗi ấy: trước khi họ
 * viết lại, thứ tự lớp bị chép ở BA chỗ (thứ tự `append`, thứ tự trong bảng
 * điều khiển, thứ tự lời gọi vẽ) "và không có gì giữ cho ba chỗ ấy khớp nhau".
 * Nên: thứ tự đăng ký LÀ thứ tự z, LÀ thứ tự vẽ, và Python đọc chính mảng này
 * thay vì có một thứ tự riêng.
 */
export const SKY_LAYERS = [
  'nen',
  'bui-xa',
  'nguon-sang',
  'loe-ngang',
  'tinh-van',
  'khe-bui',
  'soi-sang',
  'quang-chan-troi',
  'truong-sao',
  'luoi',
  'mach-hoang-dao',
  'net-chom',
  'quang-sao',
  'sao-bai',
  'loi-sao',
  'nhan',
] as const;

/** Câu chữ của route xem thử. Ở đây, không trong TSX: `node --test` đọc được. */
export const STAR_COPY = {
  title: 'Bản đồ sao — tám chòm',
  lead: 'Bốn mươi tám ngôi là bốn mươi tám bài. Tám chòm là tám chặng. Ngôi càng sáng, bài càng đòi nhiều ca chấm phải qua.',
  /** Nói ra hover CHO GÌ, không chỉ nói là có hover: nhãn lúc nghỉ chỉ còn
   *  `M1 · Tiến trình`, nên tên khoá và số bài phải được giới thiệu ở đâu đó
   *  là "trỏ vào thì có", không thì chúng là một thứ không ai biết để đi tìm. */
  hint: 'Trỏ hoặc Tab vào một chòm để nó rõ lên — và để thấy tên khoá, số bài của chặng, cùng mã bài của từng ngôi.',
  /** `alt` của tấm ảnh ĐẦU. Chỉ một tấm mang mô tả: bốn tấm nền là MỘT bức,
   *  và bốn câu mô tả cho một bức là bốn lần đọc lại cùng một thứ cho người
   *  dùng trình đọc màn hình. */
  alt: 'Bản đồ sao: tám chòm, bốn mươi tám ngôi — mỗi ngôi là một bài. Một dải Ngân Hà chạy chéo qua cả bầu trời, và một cung nét đứt nối bốn chặng NumPy, pandas, Matplotlib và dự án.',
  legendTitle: 'Chú giải',
  /** Chú giải nói ra DẤU NÀO MANG NGHĨA và dấu nào là chất liệu (§12). Ba dòng
   *  đầu là ba lớp liên kết của §4 — chúng phải phân biệt được bằng mắt, nên
   *  chúng cũng phải phân biệt được bằng chữ. */
  legend: [
    'Nét LIỀN, sắc của chặng: gom các bài của một chặng thành MỘT hình. Nó không nói thứ tự phải học.',
    'Nét ĐỨT xanh lam đi qua bốn chòm trên-phải: phụ thuộc thật duy nhất của khoá — NumPy → pandas → Matplotlib → dự án. Không có mũi tên vì nó là một quan hệ, không phải một lộ trình.',
    'Dải bụi sáng chạy chéo cả bầu trời là Ngân Hà. Mọi chòm đều nằm trong nó hoặc ngoài nó — và đó đã là một quan hệ. Nó cũng là lý do trời dày sao ở giữa và thưa ở hai góc.',
    'Ngôi có SẮC và có quầng = một bài. Bán kính lấy từ số ca chấm của bài đó, không ai chọn cho đẹp.',
    // Gọi bằng MÃ CHẶNG, không bằng tên hình: nhãn trên bản đồ chỉ còn
    // `M6 · pandas`, nên một câu chú giải nói 'chòm "Bàn có nhãn"' là chỉ vào
    // một cái tên không còn ở đâu để tìm.
    'Ở chặng M6 (pandas), hàng trên và cột trái của cái bàn có nét ĐẬM HƠN: đó là nhãn của bảng. Chặng M5 (NumPy) là một cái lưới trần — không nét nào đậm hơn nét nào, vì một ndarray không có nhãn. Đây là chỗ duy nhất trong cả bản đồ mà độ dày nét mang nghĩa.',
    'Chấm trắng xám nhỏ, không quầng = sao nền. Nó không mang tin.',
    'Lưới toạ độ mờ = chất liệu, không mang nghĩa. Nó đứt ở chỗ một ngôi đi qua.',
    'Khoảng tối giữa hai chòm không thuộc về chặng nào — ở đó không có bài nào. Vì thế bản đồ không vẽ ranh giới chòm.',
  ],
} as const;

/**
 * Bậc của một bài theo SỐ CA CHẤM, và bán kính của bậc đó.
 *
 * Hàm này là nguồn duy nhất cho cả hai phía: `build_sky.py` gọi lại đúng công
 * thức (`SKY_MAGNITUDE.base × ratio^(5−bậc)`) và ca test gọi hàm này rồi so
 * với bán kính ĐỌC TỪ SVG. Nên "ai đó chỉnh bán kính cho đẹp" là một ca đỏ.
 */
export function starMagnitude(tests: number): { tier: number; radius: number } {
  const t = SKY_MAGNITUDE.tiers.find((x) => tests >= x.minTests) ?? SKY_MAGNITUDE.tiers[SKY_MAGNITUDE.tiers.length - 1];
  const raw = SKY_MAGNITUDE.base * Math.pow(SKY_MAGNITUDE.ratio, 5 - t.tier);
  return { tier: t.tier, radius: Math.max(SKY_MAGNITUDE.floor, Math.round(raw * 100) / 100) };
}

/**
 * Toạ độ lưới cục bộ → khung 1360 × 820, tỉ lệ ĐỒNG DẠNG (`min` của hai tỉ
 * lệ), căn giữa hộp.
 *
 * `min` chứ không bóp theo từng trục, và đó là một ràng buộc chứ không phải
 * một sở thích: bóp theo từng trục cho khít hộp 310 × 210 thì cái kẹp cao 186
 * đơn vị thành một hình bè ra — tức mất đúng thứ phải đọc ra ở phép thử nhận
 * dạng (§20). Cùng công thức ở `dat_sao()` phía Python; ca test so lại từng
 * ngôi, nên hai chỗ không lệch nhau được.
 */
export function placeStar(c: SkyConstellation, s: SkyStar): { x: number; y: number } {
  const [bx, by, bw, bh] = c.box;
  const [gw, gh] = c.grid;
  const k = Math.min(bw / gw, bh / gh);
  const ox = bx + (bw - gw * k) / 2;
  const oy = by + (bh - gh * k) / 2;
  return { x: ox + s.x * k, y: oy + s.y * k };
}

/** Toạ độ bốn mốc của mạch hoàng đạo (§4.2) — NEO VÀO SAO, nên dịch một hộp
 *  chòm là cung tự đi theo. Hai mã ⇒ trung điểm (ở M8 cung đi GIỮA hai ngôi).
 *  Cùng công thức ở `mach_moc()` phía Python. */
export function zodiacAnchors(): { x: number; y: number }[] {
  const pos = new Map<string, { x: number; y: number }>();
  for (const c of SKY_CONSTELLATIONS) for (const s of c.stars) pos.set(s.code, placeStar(c, s));
  return SKY_ZODIAC.anchors.map((a) => {
    const ps = a.stars.map((code) => {
      const p = pos.get(code);
      if (!p) throw new Error(`SKY_ZODIAC neo vào ${code} — không có ngôi nào mã đó`);
      return p;
    });
    const [dx, dy] = a.offset;
    return {
      x: ps.reduce((t, p) => t + p.x, 0) / ps.length + dx,
      y: ps.reduce((t, p) => t + p.y, 0) / ps.length + dy,
    };
  });
}

/**
 * Mọi MÃ MÀU của một profile, phẳng ra — ca test dùng để soi SVG xuất ra và
 * đòi mọi mã màu trong đó có tên ở đây.
 *
 * Lọc theo HÌNH DẠNG `#RRGGBB` chứ không theo `typeof v === 'string'`: hồ sơ
 * nay còn mang `render`, `hueBranch`… cũng là chuỗi, và nhét chúng vào danh
 * sách màu sẽ làm phép kiểm nới ra một cách vô hình.
 */
export function profileColors(p: SkyProfile): string[] {
  const laMau = (v: unknown): v is string => typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v);
  const out: string[] = [];
  for (const [k, v] of Object.entries(p)) {
    if (k !== 'hues' && laMau(v)) out.push(v.toUpperCase());
  }
  for (const v of Object.values(p.hues)) out.push(v.toUpperCase());
  return out;
}
