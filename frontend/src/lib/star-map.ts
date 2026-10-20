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
      'nen', 'bui-xa', 'tinh-van', 'khe-bui', 'soi-sang', 'nguon-sang',
      'loe-ngang', 'tia-bui', 'quang-chan-troi',
    ],
  },
  { file: 'sao-nen', layers: ['truong-sao', 'luoi'] },
  { file: 'mach', layers: ['mach-hoang-dao'] },
  {
    file: 'chom',
    layers: ['hanh-tinh', 'net-chom', 'quang-sao', 'sao-bai', 'loi-sao', 'nhan'],
  },
] as const;

/** Dải Ngân Hà (đặc tả §4.3): một dải chạy chéo từ (0, 650) tới (1360, 230).
 *  Ở ô crop của bản mẫu ta chỉ thấy mép dưới của nó. */
export const SKY_MILKYWAY = {
  from: { x: 0, y: 640 },
  to: { x: 1360, y: 140 },
  /**
   * Nửa bề rộng ở hai đầu và ở giữa — dải phình ở giữa.
   *
   * Đặc tả §4.3 chốt 170–260 px BỀ RỘNG (tức nửa 85–130), và đó là con số của
   * một dải Ngân Hà nhìn như một dải. Nới lên 240–400 px ngày 19/10/2026 là
   * một phép đo, không phải một gu: ngân sách §5.2 đòi **30 %** diện tích
   * khung ở ba bậc giữa (L 0,03–0,35), mà một dải rộng 260 px chạy chéo khung
   * 1360 × 820 chỉ phủ ~24 % diện tích TRƯỚC khi `smoothstep` làm loãng hai
   * mép — tức trần vật lý của nó thấp hơn cái sàn phải đạt. Tinh vân chỉ lấp
   * được cái lỗ 46 điểm phần trăm nếu nó CÓ MẶT ở chỗ cần lấp.
   */
  halfWidth: { ends: 155, mid: 255 },
  /** Khe bụi tối chẻ dọc dải, lệch khỏi trục một chút cho khỏi đối xứng. */
  lane: { offset: -22, halfWidth: 26 },
  /**
   * DẢI ĐI CHÉO QUA SAU MẶT TRỜI, và THẮT LẠI quanh nó
   * (`bo-cuc-hung-vi.md` §8.2 · §3.4).
   *
   * Trục cũ `(0,650) → (1360,230)` đi cách tâm mặt trời mới 121 px, tức mặt
   * trời đứng ở RÌA dải. Trục này đi cách 72 px — mặt trời đứng TRƯỚC một khối
   * sáng thay vì trên nền đen, và đó là chỗ ngân sách sáng lấy lại 2,3 điểm
   * phần trăm mà §3.3 đo thấy thiếu (tham chiếu: mặt trời gánh ~70 % ngân
   * sách sáng, tinh vân ~30 %; bản cũ gần như toàn bộ là mặt trời).
   *
   * `nearSun` là VÀNH TRỐNG đo được ở §3.4: trong khung tham chiếu, tinh vân
   * KHÔNG chạm mặt trời — ở r = 0,16…0,22 · W độ chói chỉ 0,038–0,048 rồi mới
   * lên 0,25–0,30 ở r = 0,27…0,51. Đó là thiết bị bố cục mạnh nhất của khung
   * ấy và nó miễn phí: tương phản cục bộ tối đa ở đúng chỗ mắt phải nhìn
   * trước. `shrink` là hệ số nửa bề rộng ở tâm mặt trời, nới dần về 1,0 ở
   * `radius`.
   */
  nearSun: { radius: 300, shrink: 0.55 },
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
  /**
   * BỐN MỐC ĐÃ ĐỔI NGÔI NEO ngày 19/10/2026, cùng lúc bố cục đổi — và đó
   * chính là lý do mốc neo vào SAO chứ không vào toạ độ: ba trong bốn mốc tự
   * đi theo hộp mới, chỉ có việc CHỌN ngôi nào là phải quyết lại.
   *
   * · M5 chuyển từ `N01` sang `N05`: M5 nay là lưới một điểm tụ với hàng GẦN ở
   *   dưới và hàng XA ở trên, mà cung đi lên-phải thì nó phải vòng qua phía
   *   TRÊN chòm. Neo vào N01 (góc dưới-trái) thì cung cắt đúng qua N04 — đo
   *   được **0,8 px**, tức dính hẳn vào một ngôi.
   * · M6 chuyển từ `PD03` sang `PD02`: PD01 là góc TRÊN-TRÁI của cái bàn, và
   *   một cung đi tới từ dưới-trái sẽ luôn sượt qua nó — neo ở PD03 (mép
   *   phải) đo được 3,2 px tới PD01. PD02 nằm GIỮA hàng nhãn nên cung vượt
   *   qua cả hàng thay vì chạm một đầu. M6 có cả chín bài cùng 8 ca chấm, tức
   *   chín ngôi ĐỒNG hạng sáng nhất, nên chọn ngôi nào trong chín là tự do mà
   *   §4.2 đã cho.
   * · M7 chuyển từ `M03` sang `M06`: sau khi xoay −17°, M03 thôi là đỉnh và
   *   rơi về mép TRÁI chòm, nên neo vào nó làm cung quặt lại 34 px trước khi
   *   lên M8. M06 là ngôi mà cung ĐI QUA THẬT ở bố cục mới, và §4.2 cho phép
   *   chọn theo tiêu chí ấy.
   *
   * Nhờ ba lần đổi đó, bốn mốc nay ĐƠN ĐIỆU theo cả hai trục — tức một CUNG
   * LỚN, không phải một đường gấp khúc. Khác biệt ấy mang nghĩa: một cung đọc
   * ra là một QUAN HỆ, một đường gấp khúc đọc ra là một LỘ TRÌNH, mà khoá này
   * không có lộ trình đó.
   *
   * Ba cặp lệch dưới đây là kết quả quét toàn bộ tổ hợp (ngôi neo × lệch) rồi
   * giữ bộ cho **khe tới ngôi gần nhất LỚN NHẤT**: 18,8 px trên sàn 14, và cả
   * ba mốc đều trong `nearMax` 34 (đo được 20,3 · 20,6 · 18,8).
   *
   * ── MỐC PD09: `[18, 18]` → `[-18, 2]`, ngày 20/10/2026 ──────────────────
   *
   * Lời chê thứ sáu gọi tên "hai sợi mạch hoàng đạo tràn ra ngoài mép
   * trên-phải như hai sợi tóc lạc", và in bốn mốc ra là thấy ngay: mốc này
   * rơi đúng **(1361, 327)** — NGOÀI mép phải 1 px. Catmull–Rom vồng thêm
   * 14 px nữa, nên 13 điểm liền nằm ngoài khung; `viewBox` cắt chúng, và cái
   * còn lại trên tranh là một cung bị đứt làm hai mẩu bám mép. Hai sợi vì
   * dải có hai nét (`bandOffset`).
   *
   * Lệch mới đưa mốc về (1325, 311): cung chạm xa nhất x = 1354 kể cả nét
   * lề, tức còn 6 px tới mép. Khe tới ngôi gần nhất 15,7 px (sàn 14) và mốc
   * vẫn trong `nearMax` (25,0). `kiem_mach` nay GÁC điều kiện này — xem điều
   * kiện 0 ở đó, và vì sao nó gác chứ không cắt.
   */
  anchors: [
    { stars: ['N03'], offset: [-18, -18] },
    { stars: ['PD09'], offset: [-18, 2] },
    { stars: ['M06'], offset: [18, -18] },
    { stars: ['DA01', 'DA02'], offset: [0, 0] },
  ],
  /** Mịn hoá Catmull–Rom: số đoạn giữa hai mốc. */
  steps: 24,
  /**
   * Nối dài theo TIẾP TUYẾN ở hai đầu [đầu, cuối] — một vòng tròn lớn không
   * bắt đầu và kết thúc ở giữa trời.
   *
   * ĐẦU hạ 240 → 110 ngày 19/10/2026. Lý do cụ thể: với mặt trời ở giữa khung
   * và M5 ở (1008, 462), 240 px nối dài đưa đuôi cung tới ~(790, 470) — tức
   * vào đúng khoảng trống giữa M3 và M2 mà nhãn M3 cần. Bộ đặt nhãn đo được
   * "mạch hoàng đạo chạy xuyên hộp chữ" ở cả 72 hộp phía trên-phải của M3 và
   * trượt build. Và sửa nó không chỉ để nhãn vừa: một cung phụ thuộc vươn vào
   * CỘT ÁNH SÁNG giữa khung là một cung đi qua chỗ cố ý để trống (§5.4), nên
   * 110 px đúng hơn cả về bố cục.
   */
  extend: [110, 150],
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
  opacity: 0.58,
  /**
   * VỎ BỌC TỐI dưới lõi sáng — thêm 19/10/2026, và nó là bản sửa cho va chạm
   * #3 mà `bo-cuc-hung-vi.md` §11 báo trước ("mạch phụ thuộc chạy qua nhiều
   * vùng độ chói khác nhau ⇒ dễ trượt 3:1 nhất").
   *
   * Sau khi tinh vân được chiếu sáng, cung trượt thật: **2,39 : 1** tại
   * (844, 552), chỗ nền đo được L = 0,085. Và LUẬT ĐƯỜNG CHÓI của §10.3 không
   * chữa được chỗ ấy — đo rồi: ở nền L = 0,085 thì tông SÁNG cho 2,39 : 1 còn
   * tông TỐI cho **1,65 : 1**, tệ hơn. Đổi tông chỉ chữa hai ĐẦU dải; giữa
   * dải có một VÙNG CHẾT mà không tông nào đạt, vì độ mờ không đủ kéo màu ra
   * xa nền theo bất cứ chiều nào.
   *
   * Vỏ bọc thì chữa được, vì nó đổi câu hỏi: tương phản được đo giữa LÕI và
   * VỎ chứ không giữa lõi và NỀN, nên nó **độc lập với bầu trời** — đo được
   * 4,7 : 1 trên trời trống và 4,1 : 1 giữa tinh vân sáng. Cùng khuôn với
   * vòng hai nét của chip mã bài ("vòng HAI NÉT không thể cùng trượt 3:1"),
   * nên không phải một cơ chế mới phải tin.
   */
  casing: { grow: 1.6, opacity: 0.8 },
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
  /**
   * MẶT TRỜI Ở GIỮA KHUNG — chốt ngày 19/10/2026 (`bo-cuc-hung-vi.md` §3.1).
   * Hai trục quyết bằng HAI lý lẽ khác nhau, nên ghi cả hai:
   *
   * · **x = 680 đi theo lời chủ sản phẩm, KHÔNG theo phép đo.** Blob sáng
   *   trội nhất của khung tham chiếu đo ra ở x = 0,791 · W, tức lệch hẳn sang
   *   phải. Nhưng "mặt trời chói loá đứng chính giữa" là một yêu cầu phát
   *   biểu rõ ràng ở lần chê thứ năm, và nó cũng là phát biểu mạnh nhất về
   *   thứ bậc: *cái này là trung tâm, mọi thứ còn lại quay quanh nó*. Phán
   *   đoán về chỗ trí nhớ lệch phép đo: thứ chiếm giữa khung tham chiếu là
   *   KHỐI TINH VÂN, còn mặt trời là thứ SÁNG nhất — ở một bức có đúng một
   *   nguồn sáng, "chính giữa" trong trí nhớ nghĩa là "trung tâm của sự chú
   *   ý", không phải trung tâm hình học.
   * · **y = 313 theo phép đo.** 820 × 0,382 = mặt cắt vàng phía trên; khung
   *   tham chiếu đo được 0,401, lệch mặt cắt vàng đúng 1,9 % bề cao. Thêm một
   *   lý do vật lý: nguồn sáng phải CAO HƠN tầm mắt thì mọi bóng trong bức
   *   mới đổ xuống và về phía người xem. Một nguồn sáng ở đúng tâm hình học
   *   của một phong cảnh đọc ra là *một cái lỗ*, không phải *một mặt trời*.
   *   Và nó phải cách mép dưới đủ xa cho khối chân trời `SKY_HORIZON`.
   *
   * Vị trí cũ `(124, 104)` — 9,1 % bề rộng, 12,7 % bề cao — là góc trên-trái,
   * tức bức KHÔNG CÓ điểm tụ. Đó là một trong bốn thứ thiếu của công thức
   * "hùng vĩ = (một điểm tụ sáng) × (một thước ở tiền cảnh) × (tỉ số cỡ lớn
   * giữa hai cái đó) × (một hướng sáng duy nhất mà MỌI vật tuân theo)".
   */
  at: { x: 680, y: 313 },
  /**
   * Bán kính LÕI (bão hoà), bán kính QUẦNG, và bán kính ĐUÔI TAN HẾT.
   *
   * Bản cũ `core 92 / outer 150` cho tỉ số quầng : lõi = **1,63 : 1**, và đo
   * dọc một tia nó ra thế này: L = 0,7996 PHẲNG TUYỆT ĐỐI từ r = 0 tới 90,
   * rồi 0,52 ở 100, 0,14 ở 110, 0,02 ở 120, về nền ở 150. Đó không phải một
   * nguồn sáng — đó là một cái **ĐĨA** bán kính 90 px với viền xuyến 30 px.
   * Khung tham chiếu đo được đuôi dài gấp **~3,4 lần** lõi.
   *
   * `tail` là chỗ sửa cho lời chê "mép lồi lõm như một vết mực loang": đuôi
   * KHÔNG kết thúc ở `outer`. Từ 210 tới 340 độ mờ giảm tuyến tính 0,174 → 0,
   * và trong khoảng đó tinh vân đã sáng lên đủ để không ai thấy chỗ nó hết.
   * **Mép biến mất vì một lớp khác đỡ lấy nó, không vì nó được làm mềm hơn.**
   * Một quầng thật không có mép.
   */
  /** 62 → 70 cùng lượt bỏ phép thu nhỏ 0,84: bảng `profile` bão hoà tới
   *  r = 70, nên để `core` ở 62 là để hai chỗ nói hai con số về cùng một cái
   *  lõi. Nó vào nhịp dao động vòng trong cùng, gốc chín nêm tia bụi và tỉ số
   *  "vật sáng lớn nhất : sao nền" của `SKY_BUDGET.scaleRatioMin`. */
  core: 70,
  outer: 210,
  tail: 405,
  /**
   * HỒ SƠ ĐỘ MỜ TÍCH LUỸ THEO BÁN KÍNH — bảng này là thứ phải chép, không
   * phải một công thức.
   *
   * Đo trên `design/tham-chieu/ban-do-sao-game.png`: phân vị 75 của độ chói
   * trong từng vành 5 px quanh tâm mặt trời (phân vị 75 chứ không trung bình —
   * chữ UI tối nằm chồng lên và kéo trung bình xuống), quy về khung 1360 px,
   * rồi đổi ngược ra độ mờ tích luỹ cần có nếu tô ngà trên nền. Nhân tỉ lệ
   * 210/250 = 0,84 cho khung này.
   *
   * Ba điều bảng nói mà một công thức `r^(−k)` không nói được:
   *  1 **lõi phẳng và BÃO HOÀ** — A = 1,00 suốt 59 px rồi mới rơi. Bản cũ đạt
   *    đỉnh 0,7996 vì `glowCore` chỉ có L ≈ 0,88 và không vòng nào đạt α = 1.
   *  2 **có một THỀM** ở r = 76…101, A ≈ 0,851. Đây là vỏ trong của quầng và
   *    nó là thứ làm mặt trời có *cấu trúc* thay vì một sườn trơn. Phán đoán
   *    về nguyên nhân: tán xạ trong lớp khí gần sao. Dù nguyên nhân là gì, nó
   *    đo được nên nó được chép.
   *  3 **đầu gối dốc** ở r = 126…200, khớp A ∝ r^(−2,88) — gần 1/r³, luật của
   *    một vỏ cầu mỏng quang học. Khớp luỹ thừa trên cả dải thì SAI ở hai
   *    đầu, nên dùng BẢNG.
   *
   * ── PHÉP THU NHỎ 0,84 ĐÃ BỊ BỎ, 20/10/2026 — và vì sao LẦN NÀY được ────
   *
   * Bảng này từng được nhân 0,84 để quy về khung 1 360. Phép nhân ấy trông
   * như một lỗi và nó ĐÚNG là một lỗi: chia 0,84 thì mười bốn bán kính 59 ·
   * 67 · 76 · 101 · 109 · 118 · 126 · 134 · 143 · 151 · 160 · 168 · 185 · 210
   * ra đúng lưới 10 px của phép đo (70 · 80 · 90 · 120 · 130 · 140 · 150 ·
   * 160 · 170 · 180 · 190 · 200 · 220 · 250), và với bảng ĐÃ thu nhỏ thì quầng
   * tụt dưới L = 0,1 từ r ≈ 160 — *ngắn hơn chính `outer` 50 px*.
   *
   * Nó đã bị gỡ ra một lần rồi **phải trả về**, và chỗ nó mắc là chỗ đáng ghi
   * lại: M3 đứng cách tâm mặt trời 215 px CÓ Ý, nên bao lồi của nó nằm vắt
   * ngang đúng chỗ quầng tàn. Quầng rộng ra đưa nền tại nét M3 từ L ≈ 0,055
   * lên 0,086, và `kiem_tuong_phan_net` trượt ở **2,96 : 1** — rơi đúng vào
   * **VÙNG CHẾT** của LUẬT ĐƯỜNG CHÓI: vệt sáng (`#CFE3EA` ở độ mờ 0,55) hợp
   * thành L ≈ 0,35 nên chỉ đạt 3 : 1 khi nền ≤ ~0,085, còn vệt ĐÃ ĐỔI TÔNG
   * (`dustLane`, L 0,0054) chỉ đạt 3 : 1 khi nền ≥ **0,116**. Khoảng
   * [0,085 ; 0,116] không nhánh nào đạt. Hai cách né đều trả giá đo được: hạ
   * `SKY_NEBULA.hullFade.floor` làm ba bậc 0,03–0,35 tụt dưới sàn, còn nới
   * `lineOpacity` cho nhánh sáng với tới 0,116 cần ~0,80 và xoá luôn khác
   * biệt nghỉ/mờ.
   *
   * **Lần này được vì nét chòm đã có VỎ BỌC** (`SKY_LINK.casing`): tương phản
   * của nó nay đo giữa LÕI và VỎ, nên vùng chết của `litFlip` không còn là
   * một ràng buộc lên bán kính quầng. Nền sáng tới đâu cũng không kéo được
   * nét xuống dưới 3 : 1 nữa. Đó là cùng một bản sửa đã bỏ được cái hào —
   * một chỗ cộng ánh sáng thay cho hai chỗ trừ đi ánh sáng.
   *
   * Hai con số giữ nguyên CÓ Ý và không phải lỗi gõ: `outer` 210 và `soft`
   * 250 là bán kính **BỐ CỤC** (vùng cấm nhãn, nhịp loé ngang, dốc méo rìa),
   * không phải hình dạng quầng. Hình dạng quầng nằm TRỌN trong bảng này, và
   * nay nó tàn đúng ở 250 — tức "không nhãn nào nằm trong quầng" đọc thành
   * một câu về `soft` thay vì về `outer`, và vẫn đúng.
   *
   * MỘT CHỖ ĐI CHỆCH PHÉP ĐO, nói ra để không ai tưởng là lỗi gõ: §3.2 đo
   * r = 76 → 0,847 rồi r = 84 → 0,851, tức độ mờ tích luỹ TĂNG khi đi RA.
   * Vòng tô từ ngoài vào không bỏ mực ra được, nên r = 76 đặt thành 0,851.
   * Chênh 0,4 %, dưới một mã màu 8 bit — THỀM còn nguyên, chỉ hết nghịch lý.
   */
  profile: [
    [0, 1.0], [70, 1.0], [80, 0.936], [90, 0.851], [120, 0.851], [130, 0.824],
    [140, 0.788], [150, 0.708], [160, 0.59], [170, 0.487], [180, 0.381],
    [190, 0.292], [200, 0.241], [220, 0.216], [250, 0.174], [405, 0.0],
  ],
  /** Vùng CẤM tuyệt đối và vùng MỀM quanh mặt trời (§5.1 · §3.4).
   *
   *  `forbid` — không ngôi, không nét, không nhãn. `soft` — ngôi và nét được
   *  phép, nhãn thì KHÔNG, và mọi vệt trong đó đổi tông theo `litFlip`.
   *  Đĩa r < 250 là **17,6 % diện tích khung với 0 ngôi**, và nó là thiết bị
   *  bố cục mạnh nhất chép từ khung tham chiếu: tương phản cục bộ tối đa ở
   *  đúng chỗ mắt phải nhìn trước. */
  forbid: 170,
  soft: 250,
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
  /**
   * **128 VÒNG, không 16 — và đây là chỗ trả lời câu "cấm gradient thì vẽ
   * mặt trời chói loá bằng gì".**
   *
   * Luật cấm KHÔNG phải thứ đang hỏng, và bằng chứng là chính phép đo
   * `profile` ở trên: mặt trời tham chiếu là một **lõi phẳng bão hoà + một
   * đuôi ~1/r^2,9** — hai thứ mà đĩa đồng tâm tái hiện chính xác được, vì một
   * hồ sơ chỉ phụ thuộc bán kính thì vốn đã là một dãy vòng.
   *
   * Con số khép lại câu hỏi là BƯỚC LƯỢNG TỬ. Vòng chia đều theo ĐỘ MỜ TÍCH
   * LUỸ, nên bước sRGB mỗi vòng = (0,95 − 0,055) / 128 = 0,00699 =
   * **1,78 / 255 mã màu** — dưới ngưỡng thấy dải (ngưỡng thực hành cho một
   * dốc 8 bit là 2 mã). 16 vòng cho **14,3 mã**, tức dải nhìn thấy rõ, và đó
   * là một phần của cái "mảng phẳng" bị chê bốn lần.
   */
  levels: 128,
  /** NGƯỠNG ĐỘ MỜ chia ba dải màu, thay cho `coreLevels` cũ.
   *
   *  A ≥ `coreAt` → `core` `#FFFFFF`; `rimAt` ≤ A < `coreAt` → `glowCore`
   *  ngà; A < `rimAt` → `glowRim`. Chia theo ĐỘ MỜ chứ không theo số vòng vì
   *  128 vòng không cách đều theo bán kính — chúng cách đều theo A.
   *
   *  `glow` `#4E5468` ĐÃ BỊ BỎ khỏi nguồn sáng, và đó là một phép đo: nó có
   *  L = 0,0896 trong khi xám trung tính `#808080` là 0,2159 — tức "quầng
   *  sáng" đang **tối hơn xám hai lần rưỡi**. Mười trong mười sáu vòng của
   *  bản cũ tô bằng màu đó, nghĩa là cái gọi là quầng đang **HẠ** độ chói
   *  vùng nó phủ. Quầng phải là *độ mờ thấp × màu sáng*, không phải *độ mờ
   *  cao × màu tối*. Một quầng tối hơn xám thì không thể sáng. */
  coreAt: 0.97,
  rimAt: 0.34,
  /** Rìa MÉO theo góc: cùng một sóng cho mọi vòng (nên chúng không cắt nhau
   *  được), nhưng biên độ tăng theo bán kính — rìa ngoài xơ xác, lõi tròn
   *  hơn. Đó là hình của một đám mây sáng thật, và nó cũng là thứ giữ cho vật
   *  to nhất bức khỏi đọc ra là "cái đèn flash của phần mềm". */
  warp: 0.2,
  /** Biên độ méo tăng theo `(r / outer)^warpRamp`. Số mũ này từng là 0,5
   *  (căn bậc hai), và với nó thì ở mép lõi bão hoà (r = 62) hệ số đã là
   *  0,54: lõi méo ±11 % bán kính và trên PNG đọc ra là **một đa giác méo,
   *  không một đĩa**. 1,8 cho 0,12 ở cùng chỗ — lõi gần tròn — mà vẫn bằng 1
   *  ở `outer`, nên rìa ngoài xơ xác đúng như cũ. */
  warpRamp: 1.8,
  /** Dao động TẦN SỐ CAO riêng cho TỪNG vòng, biên độ = hệ số này × khoảng
   *  cách hai vòng liền nhau. Dưới một nửa, nên hai vòng **vẫn không thể cắt
   *  nhau** (ràng buộc cũ còn nguyên) nhưng biên giới của chúng thôi trùng
   *  pha — đó là thứ giữ cho 128 vòng khỏi đọc ra 128 vòng tròn. `warp` ở
   *  trên phá hình TỔNG THỂ, cái này phá sự TRÙNG PHA. */
  ringJitter: 0.45,
  /** Số điểm mỗi vòng: `clamp(40, r / segPer, segMax)`. Cũ là 96 cố định cho
   *  16 vòng; với 128 vòng thì vòng trong cùng (r = 5) không cần 96 điểm —
   *  nó cần 40, và chênh lệch ấy là vài chục KB. */
  segPer: 1.8,
  segMax: 128,
  segMin: 40,
  /** Lấm tấm trong quầng — cùng lý lẽ với lấm tấm của tinh vân: thứ giữ cho
   *  mười sáu vòng phẳng khỏi đọc ra là mười sáu cái vòng. */
  stipple: { count: 4200, size: 0.5, opacity: 0.18, at: 0.12, gain: 1.4 },
  /**
   * HAI VỆT LOÉ VUÔNG GÓC qua nguồn sáng — đọc được bằng mắt trên khung hình
   * tham chiếu (`chieu-sau-tuong-tac.md` §2.2). Không phải trang trí: một vệt
   * ngang là thứ nói ra "đây là một NGUỒN SÁNG, không phải một mảng sơn
   * sáng", và hai vệt vuông góc là chữ ký đọc-ra-ngay của "một nguồn sáng qua
   * thấu kính".
   *
   * Đây là chỗ DUY NHẤT trong bản đồ được phép có hình căn trục. Luật
   * `SKY_LINK.axisMin` cấm góc vuông cho CHÒM; vệt loé không phải một chòm.
   *
   * `span` ĐỔI NGHĨA ngày 19/10/2026, nói ra vì nó là một con số dễ đọc nhầm:
   * mã cũ tính `half = outer × span / 2`, nên span 3,4 với outer 150 cho một
   * vệt dài 510 px — không phải "714 px mỗi bên" như một phép tính của đặc tả
   * §5.1 ngầm giả định. Nay `span` đọc là NỬA vệt theo đơn vị `outer`:
   * 2,6 × 210 = **546 px mỗi bên**, vệt dài 1 092 px = 80 % bề rộng khung,
   * đúng ý định của đặc tả. `cross` là vệt DỌC, dài 0,45 lần vệt ngang.
   */
  flare: { span: 2.6, width: 2.4, opacity: 0.26, steps: 40, cross: 0.45 },
  /**
   * NÊM TIA SÁNG XUYÊN BỤI (§8.3).
   *
   * Nó nói gì: một nêm TỐI là bằng chứng có thứ CHẮN giữa mặt trời và người
   * xem, tức giữa hai vật có KHÔNG GIAN. Đây là tín hiệu "có một mặt trời ở
   * kia" mạnh thứ hai sau vệt loé, và nó rẻ — mấy chục đa giác mờ.
   *
   * ── VÒNG SỬA THỨ BA, 20/10/2026: BA NGUYÊN NHÂN, KHÔNG MỘT ────────────
   *
   * Vòng hai (`layers: 3`, `jitter: 9`) KHÔNG chữa được gì: trên PNG chúng
   * vẫn đọc ra là **chín mảnh hình học mép sắc toả đều**. Ba lý do, và cả
   * ba phải sửa cùng lúc — sửa một cái thì hai cái kia giữ nguyên triệu
   * chứng, nên vòng hai mới trông như không làm gì.
   *
   *  1 **Ba vỏ lồng nhau KHÔNG lồng nhau.** Mỗi vỏ lấy nhiễu bề rộng và
   *    nhiễu rung mép theo một hạt RIÊNG (`q` nằm trong toạ độ nhiễu), nên
   *    ba vỏ cắt chéo nhau thay vì bọc nhau. Chỗ vỏ ngoài chui vào trong vỏ
   *    lõi là một mảnh sắc cạnh — tức bản "làm mềm mép" tự đẻ thêm mép.
   *    Nay nhiễu dọc trục và rung mép chỉ phụ thuộc `(t, i)`, KHÔNG phụ
   *    thuộc `q`: mọi vỏ của một tia dùng chung một đường trục, chỉ khác
   *    nửa-góc. Lồng nhau là một tính chất của HÌNH, không phải một cái tên.
   *  2 **Ba bậc là ba cái mép.** Tán một biên bằng ba lớp phủ thì bước độ mờ
   *    ở vỏ ngoài cùng vẫn là `opacity/4` ≈ 0,05 — nhìn thấy rõ. Cái tán chỉ
   *    vô hình khi BƯỚC nhỏ hơn ngưỡng ~2 mã sRGB, tức ≈ 0,01 độ mờ, đúng
   *    bậc lượng tử của `Ink` (`STEP_OP`). Nên: `layers` 14, và độ mờ mỗi vỏ
   *    GIẢM DẦN ra ngoài (`shellAlpha` × `(1 − u)^shellPow`) chứ không chia
   *    đều — vỏ ngoài cùng đúng 0,01, vỏ trong dày hơn. Dốc nằm ở ĐỘ MỜ,
   *    không ở một `gradient` nào: cùng kỹ thuật với quầng sao 14 vòng.
   *  3 **Chín hướng toả đều là do PHÉP LỌC, không do dữ liệu.** Bộ chọn cũ
   *    loại mọi ứng viên trong 18° quanh hướng đã lấy, trên một lưới quét
   *    5° — nên sáu trong chín khe ra ĐÚNG 20°. Đo được: khe
   *    [20, 25, 45, 20, 30, 20, 20, 160, 20]. Cái đều ấy là của cái hằng số,
   *    không của bụi. Nay khe tối thiểu LẤY THEO NHIỄU trong `gapDeg`, nên
   *    hai tia có thể sát nhau (chùm) và chỗ khác thưa hẳn.
   *
   * `count` 9 → **5**: năm cái không đều đọc ra là ánh sáng, chín cái đều
   * đọc ra là một biểu tượng mặt trời. Và `pinch` cho nêm THÓP HẲN về 0 ở
   * chỗ nhiễu xuống thấp — tia có chỗ ĐỨT, như ánh sáng qua mây thật.
   */
  ray: {
    count: 5,
    within: 520,
    /** Nửa góc mở của vỏ LÕI, độ. Dải rộng gấp hơn ba lần dải cũ [4, 9]:
     *  bề rộng không đều là nửa còn lại của "không phải máy vẽ". */
    spread: [3.5, 17],
    length: [120, 520],
    /** Khe tối thiểu giữa hai hướng, độ — một KHOẢNG lấy theo nhiễu, không
     *  một hằng số. Xem lý do 3 ở trên. */
    gapDeg: [6, 30],
    /**
     * SỐ VỎ của một tia — và nó là MỘT con số cho cả độ đậm LẪN bề rộng.
     *
     * Vòng sửa thứ ba thử một chồng vỏ có độ mờ GIẢM DẦN (0,038 ở lõi →
     * 0,01 ở rìa) và bề rộng tăng đều. Trên PNG nó vẫn ra **bốn thanh tối
     * mép sắc** — và lý do tính được: với độ mờ giảm tuyến tính còn bề rộng
     * tăng tuyến tính, 70 % tổng độ mờ dồn vào năm vỏ TRONG CÙNG, mà năm vỏ
     * ấy chỉ trải trên ~4 px. Tức cái dốc vẫn là một bậc, chỉ có cái đuôi là
     * mềm. Một cái dốc mềm đòi độ mờ RẢI ĐỀU trên cả bề rộng.
     *
     * Nên: **mỗi vỏ cộng đúng một bậc lượng tử `Ink.STEP_OP` = 0,01** (bậc
     * nhỏ nhất `Ink` ghi ra được, và ~1 mã sRGB trên nền sáng — không nhìn
     * ra được), và tia đậm hơn thì có NHIỀU vỏ hơn, tức cũng RỘNG hơn. Hai
     * thứ đi cùng nhau là đúng vật lý: một cột bụi dày hơn vừa tối hơn vừa
     * to hơn. 11 vỏ ⇒ độ mờ cộng dồn 0,105; 22 vỏ ⇒ 0,199.
     */
    layers: [11, 22],
    /** Mỗi vỏ rộng thêm bấy nhiêu lần nửa-góc của vỏ lõi. 0,3 cho bước
     *  ~2,7 px giữa hai vỏ ở giữa thân tia — đủ dày để cái dốc trải ra
     *  30–70 px thay vì 13 px của vòng trước. */
    layerStep: 0.3,
    /** Nhiễu bề rộng dọc trục: `phinh = max(0, (n − pinch) × swell)` với
     *  `n` là nhiễu 0..1. Dưới `pinch` thì nêm thóp về 0 ⇒ tia ĐỨT. */
    pinch: 0.24,
    swell: 1.9,
    jitter: 9,
    steps: 15,
  },
  /**
   * LUẬT ĐƯỜNG CHÓI (§10.3) — vật trong vùng sáng thành BÓNG ĐEN.
   *
   * Trong vùng mềm (170 ≤ r < 250) nền sáng tới L ≈ 0,06–0,30. Vẽ một nét sắc
   * khoáng mờ 55 % ở đó thì nó trượt sàn 3 : 1 của WCAG 1.4.11, **lặng lẽ**.
   *
   * Luật: mọi vệt mà nền tại tâm nó đo được L > `at` thì đổi từ tông SÁNG
   * sang tông TỐI (`dustLane`). Nó đúng về vật lý (một vật trước nền sáng đọc
   * ra là bóng đen), nó đạt tương phản, và nó cho ra hiệu ứng đẹp nhất của cả
   * bản: phần của một chòm gần mặt trời nhất **sậm lại thành bóng** còn phần
   * xa thì sáng. Một chòm có hai tông vì nó nằm trong một không gian CÓ ánh
   * sáng.
   *
   * **LUẬT NÀY CÓ MỘT VÙNG CHẾT, và `at` = 0,12 nằm ở mép TRÊN của nó.** Đo
   * ngày 20/10/2026: vệt SÁNG nhất trong tám sắc (`#CFE3EA` ở độ mờ 0,55) hợp
   * thành L ≈ 0,35 nên chỉ đạt 3 : 1 khi nền ≤ ~0,085; vệt ĐÃ ĐỔI TÔNG
   * (`dustLane`, L 0,0054) chỉ đạt 3 : 1 khi nền ≥ **0,116**. Nền trong
   * khoảng **[0,085 ; 0,116]** thì KHÔNG nhánh nào đạt — câu "nét trên nền
   * sáng không trượt vì luật đường chói" đúng ở trên 0,116, không đúng ở
   * trong khoảng ấy. Cái hố đi qua mọi lần dựng trước đây chỉ vì chưa đoạn
   * nét nào rơi vào; lần đầu có một đoạn rơi vào (nét M3 ở nền 0,086 khi thử
   * nới quầng) thì `kiem_tuong_phan_net` trượt ở 2,96 : 1 và không núm nào
   * trong tệp này chữa được. Bịt nó = cho nét chòm một VỎ BỌC như mạch hoàng
   * đạo — xem khối chú thích dài ở `profile` ngay trên.
   */
  litFlip: { at: 0.12, dither: 24 },
  /**
   * VÀNH SÁNG RÌA — một luật, ba chỗ dùng, không ngoại lệ (§8.4).
   *
   * MỌI vật thể rắn (khối chân trời, ba hành tinh, vành đai) nhận một cung
   * `glowCore` mỏng, **chỉ trên nửa quay về mặt trời**, độ mờ giảm theo
   * `max(0, cos θ)^falloff` với θ = góc giữa pháp tuyến và hướng tới mặt
   * trời. Đó là thứ làm cả bức có MỘT hướng sáng — mục thứ tư trong công thức
   * hùng vĩ, và mục mà bản cũ có 0 trên 4.
   */
  rim: { width: 1.2, opacity: 0.55, falloff: 1.4 },
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
  brightShareMin: 0.045,
  brightShareMax: 0.12,
  medianMax: 0.05,
  /**
   * SÀN trung vị và SÀN bậc giữa — hai cái gác thêm ngày 19/10/2026, và chúng
   * gác chiều NGƯỢC với `medianMax`.
   *
   * Lời chê thứ năm ("chưa hùng vĩ") đo ra được bằng đúng một bảng: 89,7 %
   * diện tích ở L < 0,01, 2,55 % ở một mảng phẳng 0,60–0,85, và **0,95 %** ở
   * năm bậc GIỮA — trong khi khung tham chiếu có **46,8 %** ở bậc giữa. Một
   * bức tranh LÀ phần trung gian của nó; thiếu phần đó thì hình nằm trên nền
   * và nền không phải là gì cả, tức một SƠ ĐỒ.
   *
   * Và trước hai dòng này thì **không một phép kiểm nào trong kho mã bắt được
   * kiểu hỏng ấy**: cả `medianMax` lẫn `brightShareMax` đều chặn chiều SÁNG
   * QUÁ. Bản cũ đạt mọi phép kiểm trong khi gần 90 % bức là đen tuyệt đối.
   * Một ngân sách chỉ có trần là một ngân sách gác được một nửa.
   *
   * `midShareMin` đo trên ba bậc 0,03–0,35 chứ không trên cả năm bậc giữa:
   * hai bậc quầng (0,35–0,85) bị bỏ ra ngoài CÓ Ý, để không ai đạt được cái
   * sàn này bằng cách phóng mặt trời to hơn. Nó chỉ đạt được bằng tinh vân
   * ĐƯỢC CHIẾU SÁNG.
   */
  medianMin: 0.015,
  midShareMin: 0.3,
  /** Mốc tám bậc của bảng chẩn đoán, và hai đầu của "bậc giữa". `mid3Hi` là
   *  trần của con số CHẶN BUILD; `midHi` là trần của con số BÁO CÁO. */
  bands: [0.01, 0.03, 0.08, 0.18, 0.35, 0.6, 0.85],
  midLo: 0.03,
  midHi: 0.85,
  mid3Hi: 0.35,
  sampleStep: 4,
  /** Tỉ lệ ĐƯỜNG KÍNH vật sáng lớn nhất : sao nền. Tham chiếu ~45:1, ngưỡng
   *  đi/dừng của bản đánh giá là 15:1. Đạt được KHÔNG BẰNG cách phóng to ngôi
   *  nào — bán kính 48 ngôi vẫn do số ca chấm quyết (luật 4 ở đầu tệp). */
  scaleRatioMin: 15,
} as const;

/**
 * KHỐI CHÂN TRỜI — RÌA MỘT THIÊN THỂ, không còn là một dải gạch ngang
 * (`bo-cuc-hung-vi.md` §7.1).
 *
 * Lớp cũ là một dải 170 px gạch ngang ở đáy khung: nó mờ, nó không có mép, và
 * **nó không phải một vật**. Đo được: ở độ mờ tích luỹ 0,47 nó chỉ đạt
 * L ≈ 0,009, tức cả cái dải nằm trong bậc "đen sâu" — một lớp phủ 20 % bề cao
 * khung mà không nhấc một điểm nào ra khỏi bậc thấp nhất.
 *
 * **Nó nói gì:** bản đồ sao luôn được vẽ TỪ MỘT CHỖ. Lớp này là chỗ đó — nơi
 * người học đang đứng. Đặc tả cũ đã ngầm khẳng định điều ấy bằng chữ "quầng
 * chân trời"; bản này chỉ làm cho nó thành một vật nhìn thấy được.
 *
 * **Nó làm gì cho bức tranh:** bốn việc, không việc nào thay được bằng thứ
 * khác.
 *  1 **một mép cứng, liền, chạy hết bề rộng** — tín hiệu chiều sâu mạnh nhất
 *    có thể có với một nét duy nhất;
 *  2 **một cái THƯỚC**: 1 250 sao nền dừng lại đột ngột ở mép đó, nên mắt suy
 *    ra ngay cái này ở gần, kia ở xa. Không có thước thì không có hùng vĩ, vì
 *    hùng vĩ là một **tỉ số**, không phải một kích thước;
 *  3 **một khối tối lớn** đối trọng với mặt trời chói ở giữa — luật repoussoir;
 *  4 **hướng sáng**: vành sáng chỉ xuất hiện ở nửa quay về mặt trời, nên nó
 *    CHỨNG MINH có một nguồn sáng chứ không chỉ hiển thị một nguồn sáng.
 *
 * Diện tích chỉ ~5,8 % khung là **cố ý**: khung tham chiếu chỉ có 20,5 % ở
 * L < 0,01 còn bản này đã 89,7 % — thứ đang thiếu là TRUNG GIAN, không phải
 * bóng tối. **Repoussoir ở đây làm việc bằng MÉP, không bằng diện tích.**
 */
export const SKY_HORIZON = {
  /** Tâm và bán kính của thiên thể. R = 3 800 trên một khung rộng 1 360 cho độ
   *  võng 61 px — đủ để mép đọc ra là một CUNG (tức một vật tròn rất lớn) mà
   *  chưa thành một cái bát. Đỉnh rìa ở y = 752, hai mép khung ở y = 813. */
  at: { x: 680, y: 4552 },
  radius: 3800,
  /** Vành sáng rìa: cung mỏng `glowCore`, độ mờ giảm theo
   *  `max(0, cos θ)^falloff` với θ = góc giữa pháp tuyến rìa và hướng tới mặt
   *  trời ⇒ sáng nhất ở x = 680, mờ nhất ở hai mép khung. */
  rim: { width: 2.2, opacity: 0.62, falloff: 1.4 },
  /** Lớp khí: cung thứ hai, dày hơn và mờ hơn, ngay TRÊN vành sáng. */
  air: { width: 6, opacity: 0.12 },
  /** Bề dày lớp khí quyển TRÊN rìa, px — vùng mà sao nền mờ đi và TO hơn
   *  (phối cảnh khí quyển, `SKY_FIELD.horizonFade` / `horizonSwell`). Thay cho
   *  `height` cũ, và nó chỉ còn một việc: làm thước cho hai hệ số ấy. Khối tối
   *  thì tô ĐẶC nên nó không cần một hồ sơ độ mờ nào. */
  haze: 120,
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
  /** Hệ số mật độ theo vùng (§7.1). Dòng `hull` THƯA sao nền quanh một chòm,
   *  nên 48 ngôi mang nghĩa không lẫn vào 1 250 chấm.
   *
   *  0,30 → 0,70 ngày 20/10/2026, cùng lượt bỏ cái hào. Đây là lớp DUY NHẤT
   *  còn dùng `hull_atten`, và nó được ở lại vì nó bớt CHẤM chứ không dìm
   *  ÁNH SÁNG — một vùng thưa sao đọc ra là "chỗ này trống", một vùng bị
   *  trừ ánh sáng đọc ra là "chỗ này bị khoét". Nhưng 0,30 là thưa gấp hơn
   *  ba lần, và ở `hullPad` 44 px quanh cả 50 nét thì chính nó cũng góp một
   *  phần vào cái hào nhìn thấy được. 0,70 giữ được việc mà không góp. */
  density: { core: 3.4, edge: 1.6, plain: 1.0, lane: 0.15, far: 0.45, hull: 0.7 },
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
  /** Trời loãng đi trong bấy nhiêu px quanh HÌNH chòm — nét và ngôi (§7.1).
   *
   *  18 → 44 ngày 20/10/2026 vì cái đo đã đổi: trước đó khoảng cách tính tới
   *  BAO LỒI đã nở, nên 18 px là "nở thêm 18 ngoài bao lồi" và cả ruột bao
   *  lồi tối phẳng. Nay tính tới chính nét và ngôi (`fig_dist`), nên con số
   *  này là BỀ RỘNG THẬT của lối sáng mà chòm rẽ qua tinh vân — xem
   *  `hull_atten`. 44 px là chỗ chòm còn đọc được mà tinh vân thôi bị khoét
   *  thành đa giác. */
  hullPad: 44,
  /** Nở bao lồi ra bao nhiêu khi ĐO trần độ chói cục bộ (§3.1). */
  ceilingPad: 24,
} as const;

/** Tinh vân (§3.1 · §9.5). Năm đường đồng mức LỒNG NHAU, mỗi cái một độ mờ
 *  phẳng — KHÔNG phải một `radial-gradient` phủ. Cộng dồn 1 − 0,85⁵ ≈ 0,56 ở
 *  lõi và 0,15 ở rìa, qua bốn bậc trung gian. */
export const SKY_NEBULA = {
  /**
   * **14 BẬC, không 5 — và đây là bước đáng giá nhất của cả bản vẽ lại.**
   *
   * Chẩn đoán của lời chê thứ năm là một cái lỗ ~46 điểm phần trăm ở các bậc
   * độ chói GIỮA (`SKY_BUDGET.midShareMin`). Và chỗ thiếu **KHÔNG phải mặt
   * trời**: trong khung tham chiếu mặt trời gánh ~70 % ngân sách sáng, tinh
   * vân ~30 %, còn phần bản này hụt nằm nguyên ở **tinh vân chưa được chiếu
   * sáng**. Tinh vân cũ không biết mặt trời ở đâu nên nó là một tấm vải tối
   * ĐỀU — và một tấm vải tối đều không có bậc giữa nào để đóng góp.
   *
   * Vì sao phải nâng số bậc CÙNG LÚC với `lambert`: một dốc Lambert là liên
   * tục, tô nó bằng 5 bậc cho ra 5 vệt dải nhìn thấy được — bước sRGB mỗi bậc
   * ≈ 34 mã màu, gấp 17 lần ngưỡng 2 mã. 14 bậc hạ xuống ~12 mã, và
   * `levelDither` ở dưới hạ tiếp xuống ~3 mã hiệu dụng.
   *
   * ── 20/10/2026: **14 → 22 BẬC, và độ mờ mỗi bậc 0,15 → 0,12** ───────────
   *
   * Lý do là một con số TÍNH ĐƯỢC chứ không một cảm giác, và nó giải thích
   * đúng câu chê còn lại ("vẫn là *tối, với một nguồn sáng*, chưa là *sáng
   * khắp, có tầng*"). Tô từ ngoài vào trên nền `base` với bản 14 bậc —
   * 7 × `nebula`, 4 × `nebulaCore`, 3 × `nebulaLit`, mỗi lớp α 0,15 — hợp
   * thành **rgb(105, 115, 139) = L 0,173**. Tức TRẦN độ chói của cả lớp tinh
   * vân nằm NGAY DƯỚI mốc 0,18: **không một điểm tinh vân nào rơi được vào
   * bậc 0,18–0,35**, và 3,70 % đo được ở bậc ấy là của riêng mặt trời. Hai
   * bậc 0,18–0,60 hụt 9,5 điểm phần trăm so với khung tham chiếu vì thế.
   *
   * 22 bậc không phải để mịn hơn — nó là để có đủ BẬC THANG. Dốc độ chói của
   * một ramp α đều là dốc LỒI: bước nhỏ ở đáy, lớn ở đỉnh. Với 14 bậc, bậc
   * 0,08–0,18 chỉ được hai nấc thang nên nó nhận 3,7 % diện tích trong khi
   * tham chiếu đòi 11 %. 22 nấc trải đều hơn: 0,08 · 0,10 · 0,13 · 0,16 ·
   * 0,19 · 0,22 · 0,24 · 0,27 · 0,29 · 0,31 · 0,33 · 0,36 · 0,41 · 0,45.
   */
  levels: 22,
  levelOpacity: 0.12,
  /**
   * CHIẾU SÁNG TINH VÂN — Lambert trên mặt ẩn (§8.1). Đây là cái "đổ bóng"
   * mà chủ sản phẩm đòi, và nó là thứ lấp phần lớn cái lỗ 46 điểm phần trăm.
   *
   *     Λ(x, y) = floor + (1 − floor) · D · S
   *     D = (dRef / max(d, dRef))^dSlope       d = khoảng cách tới mặt trời
   *     S = clamp(sMin, sMax, sBias + sGain · (n̂ · ŝ))
   *     n̂ = ∇F chuẩn hoá (F = trường tinh vân đã có, sai phân trung tâm 2 px)
   *     ŝ = véc-tơ đơn vị từ điểm tới mặt trời
   *
   * · `D` là suy giảm theo khoảng cách — sườn **1,3 chứ không 2,0**: tinh vân
   *   là môi trường TÁN XẠ, không phải một mặt nhận sáng điểm.
   * · `S` là **tự đổ bóng**: chỗ gradient mật độ quay VỀ mặt trời thì sáng
   *   (S → 1), chỗ quay ĐI thì tối (S → 0,25). Đây mới là thứ cho ra "đổ bóng
   *   các kiểu" — cùng một đám mây có sườn sáng và sườn tối, và hai sườn ấy
   *   nhất quán với mọi vật khác trong bức.
   * · `floor` giữ cho góc xa nhất không đen tuyệt đối (tham chiếu: L ≈ 0,10 ở
   *   r = 0,6 · W).
   *
   * **Λ gấp vào TRƯỜNG, không nhân vào độ mờ.** Đặc tả §8.1 nói "nhân độ mờ
   * của mỗi mẫu", nhưng `contours()` cho ra đa giác độ mờ PHẲNG — không có
   * chỗ nào để nhân một hệ số theo điểm vào. Gấp vào trường thì sườn quay về
   * mặt trời leo lên bậc đồng mức CAO hơn, tức sáng hơn, và phép ĐO
   * (`do_sang_rgb` đếm số bậc phủ một điểm) tự đúng theo mà không phải viết
   * lại. §10.6 cũng đã chốt đúng cách ấy cho bản sáng: *"Λ cộng vào F trước
   * khi tra bảng bậc"*.
   *
   * `floor`, `dSlope` và `sGain` là PHÁN ĐOÁN, không phép đo — phép đo xác
   * nhận chúng là bảng tám bậc của `--do`.
   */
  lambert: {
    floor: 0.22,
    dRef: 210,
    dSlope: 1.3,
    sMin: 0.25,
    sMax: 1.0,
    sBias: 0.5,
    sGain: 2.0,
    /** Bước sai phân trung tâm khi lấy ∇F, px. */
    grad: 2,
  },
  /**
   * LẤM TẤM Ở BIÊN mỗi bậc — cách rẻ nhất giữ luật cấm gradient mà không
   * thấy dải.
   *
   * Ba phương án đã cân (§8.1): 14 bậc trần = 12 mã/bậc, **vẫn thấy dải ở
   * vùng rộng**; 24 bậc = 7 mã nhưng +88 KB; 14 bậc + lấm tấm nhiễu-xanh ở
   * biên = ~3 mã hiệu dụng với +52 KB. Chọn cách ba.
   *
   * `band` là bề rộng dải rắc quanh mỗi đường đồng mức, `per1000` là mật độ
   * chấm trên 1 000 px². Chấm mang tông của bậc CAO hơn, nên mắt đọc ra một
   * chuyển tiếp thay vì một biên.
   */
  levelDither: { band: 10, per1000: 28 },
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
  /** Trường = dải × (floorMix + (1 − floorMix) × nhiễu đã chuẩn hoá).
   *
   *  0,30 → 0,16 ngày 20/10/2026, và nó là CÁI GIÁ của việc bỏ cái hào —
   *  trả ở đúng chỗ phải trả. Cái hào làm loãng tinh vân trên ~32 % diện
   *  tích khung, tức nó đang gánh một phần NGÂN SÁCH SẮC ĐỘ TOÀN BỨC bằng
   *  một thủ pháp CỤC BỘ. Bỏ nó mà không bù thì trung vị độ chói leo
   *  0,0393 → 0,0476, sát trần `medianMax` 0,05, và bậc giữa nhảy lên
   *  70,7 % (tham chiếu 46,8) — tức bức đổi từ "có một cái lỗ" sang "một
   *  màn sương xám đều khắp khung", đúng kiểu hỏng mà `tren018` được thêm
   *  vào để phân biệt.
   *
   *  Bù bằng `floorMix` chứ không bằng `levelOpacity` vì `floorMix` là SÀN
   *  của trường: hạ nó lấy đi phần tinh vân MỜ NHẤT (bậc 0,03–0,08 phình
   *  tới 39 %) mà không đụng vào lõi, nên nhiễu chiếm tỉ trọng lớn hơn và
   *  vân rõ hơn — đi cùng chiều với thứ đã được khen, không ngược lại.
   *  Đo lại: trung vị 0,0403 (gần đúng mức trước, 0,0393), bậc giữa 63,1 %,
   *  đen sâu 14,8 %. */
  floorMix: 0.16,
  /** Ngưỡng của MƯỜI BỐN đường đồng mức, từ rìa vào lõi. Đây là THAM SỐ TRƯỜNG
   *  nên nó KHÔNG được hồ sơ hoá (§19.2 dòng 5): Ngân Hà phải cùng một hình
   *  dạng ở cả hai bản, và nhờ dùng đường đồng mức thì nó không thể lệch —
   *  hình học là một, chỉ cách TÔ là hai.
   *
   *  Hai con số HẠ XUỐNG khi `lambert` vào: trường nay là `neb_fade × Λ` với
   *  Λ ∈ [0,22 ; 1,0], nên dải giá trị co lại gần ba phần. Giữ 0,2–0,6 thì
   *  mười một bậc trong cùng không đường nào cắt được gì — tức đúng cái bẫy
   *  "chuẩn hoá lại dải giá trị" ghi ở `normalize` ngay trên, chỉ ở một tầng
   *  khác.
   *
   *  `levelLo` HẠ 0,045 → 0,012 ngày 20/10/2026, và đó cũng là một phép đo:
   *  hình học của dải (`mw_half`) cho trường KHÁC 0 trên **47,5 %** diện tích
   *  khung, nhưng đường đồng mức ngoài cùng ở 0,045 chỉ bao **29,5 %**. Tức
   *  gần một PHẦN BA dải Ngân Hà nằm trong khung mà KHÔNG được tô lớp nào —
   *  và đó là chỗ phần "đen sâu" thừa 8 điểm phần trăm đang ở. Hạ xuống 0,012
   *  đưa mép tinh vân ra tới 37,5 %. Không hạ tới 0: bậc ngoài cùng khi ấy là
   *  một đường bám đúng mép dải, dài mà vô hình.
   *
   *  `levelHi` HẠ 0,34 → 0,30: trường chỉ vượt 0,34 ở 2,9 % diện tích, nên
   *  bậc TRONG CÙNG (bậc sáng nhất, nay L ≈ 0,45) không thể phủ hơn 2,9 %. Ở
   *  0,30 nó phủ 3,5 % và cả thang dịch xuống theo — tức nửa TRÊN của dải
   *  giữa có thêm diện tích mà không phải sáng thêm.
   *
   *  `levelHi` HẠ TIẾP 0,30 → 0,26 cùng lượt kéo bụi lại (xem `dust`). Kéo
   *  bụi về làm cả bức tối đi ĐỀU, nên nếu chỉ làm mỗi thế thì hai bậc
   *  0,18–0,60 — vốn đã hụt — còn mỏng thêm. 0,26 nén cái thang 22 bậc vào
   *  một dải trường hẹp hơn, tức mỗi bậc phủ rộng hơn: bậc "rìa quầng"
   *  0,35–0,60 đi 5,53 → 6,53 % (tham chiếu 7,4) mà `L > 0,5` chỉ nhích
   *  6,74 → 6,83 %. Chỗ sáng thêm nằm Ở LÕI TINH VÂN, không ở một lớp phủ
   *  nào trải đều — đó là khác nhau giữa "sâu hơn" và "sáng hơn". */
  levelLo: 0.012,
  levelHi: 0.26,
  /** BỐN TÔNG cho hai mươi hai bậc, và bậc nào đổi tông.
   *
   *  Vì sao phải thêm `nebulaLit` chứ không giãn hai tông cũ: `nebulaCore`
   *  `#434559` tô ĐẶC mới chỉ đạt L = 0,062, tức hai khoá cũ không có cách
   *  nào với tới bậc "tinh vân sáng" 0,18–0,35 mà ngân sách §5.2 đòi 5,4 %
   *  diện tích. Trần vật lý của bảng màu cũ thấp hơn cái sàn phải đạt. Màu
   *  vẫn chỉ sống ở hồ sơ TS — đây là một khoá mới ở hồ sơ, không một mã màu
   *  nào ở Python.
   *
   *  `nebulaPeak` thêm ngày 20/10/2026 là **ĐÚNG lý lẽ ấy, lùi lên một bậc**:
   *  `nebulaLit` `#AFBCD4` tô ĐẶC đạt L = 0,498, nên một chồng bậc α 0,12
   *  không với tới bậc "rìa quầng" 0,35–0,60 được — hợp thực tế của nó dừng ở
   *  ~0,36. Ba bậc trong cùng tô bằng tông mới đưa đỉnh lên **L 0,448**, tức
   *  mở bậc 0,35–0,60 ra cho tinh vân. Tông mới phải NHẠT mà không NO:
   *  `#E6ECF6` đo bão hoà HSV 0,085, dưới cả 0,196 của khung tham chiếu —
   *  xem §10.4, một tông mới no hơn là một tông sai.
   *
   *  NĂM bậc ngoài cùng GIỮ `nebula`, và đây là chỗ bảng số bị BÁC có chủ ý:
   *  phép dò muốn chỉ 3 bậc sẫm (được thêm ~2 điểm phần trăm ở hai bậc giữa),
   *  nhưng khi ấy nửa trong của dải đã là xám nhạt ngay từ nấc thứ tám — mép
   *  dải thôi là xanh sẫm và cả khối đọc ra "bệt, đục", đúng cái phải tránh.
   *  Một bảng số khớp trên một bức bệt là thất bại. */
  ramp: ['nebula', 'nebulaCore', 'nebulaLit', 'nebulaPeak'],
  rampAt: [0, 5, 9, 19],
  /** Lớp bụi xa: dải rộng gấp bấy nhiêu, ba ngưỡng, độ mờ mỗi bậc.
   *
   *  `spread` 2,6 → 3,2 ngày 20/10/2026. Đây là lớp DUY NHẤT với tới mấy góc
   *  khung, nên nó là lớp duy nhất nói được gì về bậc "đen sâu": khung tham
   *  chiếu có 20,5 % diện tích ở L < 0,01 còn bản này 31,9 %, và chênh lệch
   *  nằm nguyên ở bốn góc ngoài dải Ngân Hà. Nới dải đưa bậc bụi THẤP NHẤT
   *  (một lớp phủ, L 0,018) ra xa hơn: 78 % → 86 % diện tích.
   *
   *  ĐÃ THỬ THÊM BẬC THỨ TƯ RỒI BỎ. Nó nâng MỌI vùng lên một nấc, nên vùng
   *  đang có hai lớp phủ nhảy L 0,018 → 0,039 và bậc 0,03–0,08 phình
   *  **24 → 38 %** (tham chiếu 24) kèm trung vị 0,0396 — gần `medianMax`.
   *  Một bậc thêm vào một thang đều là một phép dịch cả thang, không phải
   *  một chi tiết thêm ở đầu nào.
   *
   *  ── KÉO LẠI, 20/10/2026: `spread` 3,2 → 2,75 · `opacity` 0,20 → 0,15 ──
   *
   *  Hai dòng ngay trên là một lịch sử ĐUỔI THEO MỘT CON SỐ, và đây là chỗ
   *  trả giá. Bậc giữa là một ĐÍCH (46,8 % ở khung tham chiếu), không phải
   *  một thứ càng cao càng tốt; đẩy nó lên 63 % đã VƯỢT đích 16 điểm, và
   *  cái giá trả bằng chiều sâu: đen sâu tụt 24,95 → 14,64 % (tham chiếu
   *  20,5) còn bậc "tinh vân mờ" phình 36,90 % (tham chiếu 24,0). Bức ra
   *  đục như sữa — nhìn thấy ngay trên PNG.
   *
   *  Vì sao sửa Ở ĐÂY chứ không ở tinh vân: cả hai khuyết tật là MỘT lớp.
   *   · `spread` một mình quyết bậc "đen sâu", vì đen sâu đúng bằng phần
   *     khung nằm NGOÀI bậc bụi thấp nhất — 2,75 cho 20,5 %, khớp tham
   *     chiếu tới chữ số thập phân;
   *   · `opacity` quyết chỗ cái thang bụi RƠI VÀO bậc nào. Ở 0,20 thì hai
   *     lớp phủ ra L 0,0393, nằm giữa bậc 0,03–0,08 — và `nebula` `#303852`
   *     tô đặc chỉ đạt L 0,0377, tức **năm bậc tinh vân ngoài cùng chồng
   *     lên bụi mà chỉ nhích 0,0393 → 0,0399**: một mảng phẳng rộng, đúng
   *     nghĩa đục. Ở 0,15 hai lớp phủ ra 0,0272 (về bậc "nền trời") và năm
   *     bậc ngoài leo đều 0,0272 → 0,0331. Vân tinh vân ĐỌC ĐƯỢC trên nền
   *     bụi, chứ không chỉ là 10 điểm phần trăm đổi chỗ trong bảng. */
  /** `hullFade: 1` = bụi xa KHÔNG loãng đi quanh chòm nữa. Cùng lý do với
   *  `hullFade` ở dưới: hai lớp này cộng lại là cái hào mà lời chê thứ sáu
   *  gọi đúng tên — bớt đi ánh sáng quanh một hình là khoét một cái lỗ. */
  dust: { spread: 2.75, freq: 4.2, levels: [0.24, 0.42, 0.58], opacity: 0.15, hullFade: 1.0 },
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
  /**
   * CÁI HÀO ĐÃ BỊ BỎ — `floor: 1` nghĩa là tinh vân KHÔNG còn loãng đi quanh
   * chòm nào (20/10/2026). Khoá còn lại vì nó là chỗ ghi lại vì sao.
   *
   * ── HAI VÒNG SỬA HÌNH, MỘT NGUYÊN NHÂN KHÔNG ĐỔI ───────────────────────
   *
   * Lớp này ra đời để giữ nét chòm ở 3 : 1: làm loãng tinh vân quanh chòm thì
   * nét sáng nằm trên nền tối và phép đo đạt. Hình của nó đã sửa hai lần —
   * vòng một theo BAO LỒI (tám mảng tối cạnh thẳng), vòng hai theo HÌNH chòm
   * (`fig_dist`, mép gợn theo nhiễu) — và **cả hai vòng người xem vẫn gọi nó
   * là một cái hào**. Sửa hình không chữa được, vì cái bị nhìn thấy không
   * phải MÉP mà là VIỆC: chỗ này đang mua tương phản bằng cách TRỪ ĐI ÁNH
   * SÁNG, và một chỗ bị trừ ánh sáng giữa một vùng sáng đọc ra là một **vết
   * khoét trong bức tranh**. Bức tranh không có lỗ.
   *
   * Thứ thay nó là `SKY_LINK.casing` — một VỎ BỌC ôm lấy chính nét, tông
   * ngược với lõi. Tương phản đo giữa lõi và vỏ nên nó không cần bầu trời
   * phải tối ở đâu cả, và nó CỘNG vào bức (một nét có hai tông) thay vì trừ
   * đi một mảng.
   *
   * Giá đã đo bằng raster, và nó đi đúng chiều cả phiên đang đẩy: bỏ hào trả
   * mid-tone lại cho ~32 % diện tích khung mà tám bao lồi chiếm.
   *
   * `pad` / `warp` / `warpFreq` giữ lại vì `SKY_FIELD.density.hull` vẫn dùng
   * `hull_atten` để THƯA sao nền quanh chòm — thưa sao là bớt CHẤM, không
   * phải dìm ÁNH SÁNG, nên nó không có kiểu hỏng ở trên.
   */
  hullFade: { pad: 1.0, floor: 1.0, warp: 0.6, warpFreq: 16 },
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
  /** 0,55 → 0,70 · 0,85 → 0,88 ngày 20/10/2026 — lý do đầy đủ ở
   *  `SKY_PROFILE_DARK.scale.lineOpacity`, và hai chỗ PHẢI khớp nhau (một
   *  ca test so lại; `SKY_LINK` là LUẬT, `profile.scale` là thứ bộ sinh đọc).
   *
   *  `focusOpacity` KHÔNG được đẩy tới 0,95, và trần của nó là một phép
   *  tính chứ không một gu: vỏ bọc đậm theo tỉ số `focusOpacity / opacity`
   *  (`ve_net_chom`), nên 0,78 × 0,95 / 0,70 = 1,06 ⇒ vỏ bão hoà ở 1,0.
   *  Lúc ấy `Ink` BỎ HẲN thuộc tính độ mờ (1,0 là mặc định của SVG) và tấm
   *  RÕ chỉ còn một bề rộng nét thay vì cặp lõi↔vỏ — tức hiệu ứng hai tông
   *  của LUẬT ĐƯỜNG CHÓI biến mất đúng ở trạng thái người ta đang nhìn.
   *  0,88 cho vỏ 0,98, còn nguyên cặp. */
  opacity: 0.7,
  focusOpacity: 0.88,
  /** Nét DỪNG CÁCH TÂM SAO `r + gap`: quy ước bản đồ sao — nét nối không được
   *  chạm vào sao, nếu không sao thành một cái nút của nét thay vì một vật
   *  thể. Đây cũng là lý do bản vực cũ nhìn rối. */
  gap: 2.5,
  /** Rung tay ±0,9 px: nét thẳng tuyệt đối đọc ra "sơ đồ". */
  wobble: 0.9,
  /**
   * VỎ BỌC CỦA NÉT CHÒM — và đây là chỗ bức tranh thôi mua tương phản bằng
   * BÓNG TỐI (20/10/2026).
   *
   * ── CÁI NÓ THAY THẾ ────────────────────────────────────────────────────
   *
   * Nét chòm giữ được 3 : 1 nhờ `SKY_NEBULA.hullFade`: tinh vân bị LÀM LOÃNG
   * quanh mỗi chòm, nên nét sáng nằm trên một chỗ trời đã bị dìm. Cách ấy
   * luôn đạt phép đo và luôn hỏng bức tranh, vì nó giải bài toán "cho hình
   * nổi lên" bằng cách TRỪ ĐI ÁNH SÁNG — và một chỗ trừ ánh sáng có mép thì
   * đọc ra là một **vết khoét**, không phải một vùng trời. Hai vòng đánh giá
   * liên tiếp chê đúng chỗ này: vòng trước nó mang hình bao lồi, vòng sau nó
   * ôm lấy hình chòm, nhưng cả hai vòng nó vẫn là một cái hào tối.
   *
   * ── VÌ SAO VỎ BỌC GIẢI ĐƯỢC ────────────────────────────────────────────
   *
   * Tương phản được đo giữa LÕI và VỎ, nên nó **không phụ thuộc vào nền**.
   * Đó đúng là thủ pháp đã cứu mạch hoàng đạo (`SKY_ZODIAC.casing`) khi cung
   * trượt xuống 2,39 : 1 — cùng một cơ chế, nên không phải tin một thứ mới.
   * Khác một điểm, và điểm ấy bắt buộc: mạch có MỘT tông nên vỏ của nó luôn
   * tối, còn nét chòm có HAI tông (LUẬT ĐƯỜNG CHÓI, §10.3) nên vỏ phải chọn
   * tông **NGƯỢC** với lõi — vỏ tối dưới vệt sắc khoáng, vỏ sáng dưới vệt đã
   * đổi sang `dustLane`. Chọn cùng tông là xoá luôn hiệu ứng hai tông, tức
   * mất chỗ mà một chòm gần mặt trời SẬM LẠI THÀNH BÓNG còn phần xa thì sáng.
   *
   * Và vì vỏ bọc làm cho tương phản độc lập với nền, nó mở ra HAI thứ cùng
   * lúc mà trước đây kẹt nhau: bỏ hẳn cái hào (`hullFade`), và nới quầng mặt
   * trời (bỏ phép thu nhỏ 0,84 ở `SKY_LIGHT.profile`) — xem VÙNG CHẾT của
   * `litFlip` ở đó.
   *
   * `grow` là phần RỘNG THÊM so với lõi (px bề rộng nét, không phải bán
   * kính): 1,6 cho một lõi 1,15 nghĩa là vỏ lộ ra ~0,8 px mỗi bên — đủ để
   * mắt có một dải so sánh, chưa đủ để nó đọc ra là một nét thứ hai.
   * `opacity` 0,62 là con số nhỏ nhất còn giữ cả 700 điểm đo trên 3 : 1 ở
   * trạng thái NGHỈ sau khi hào bị bỏ và quầng được nới.
   *
   * ── 0,62 → 0,78, 20/10/2026: 3 : 1 LÀ SÀN, KHÔNG LÀ MỤC TIÊU ───────────
   *
   * "Con số nhỏ nhất còn giữ 3 : 1" là đúng cách chọn một con số khi thứ
   * đang mua là tương phản cho một nét PHỤ. Nét chòm không phải nét phụ: nó
   * là tám chặng của khoá học, thứ MANG NGHĨA duy nhất trong cả bức. Đo
   * được sau khi nền sáng lên: 3,44 : 1 — tức một yếu tố chính đang sống ở
   * đúng mép sàn tối thiểu, và trên PNG nó đọc ra đúng như thế: M2 và M7
   * gần như chìm vào tinh vân.
   *
   * 0,78 cho vỏ một tông gần thuần hơn, nên dải lộ ra hai bên lõi thật sự
   * là một tông NGƯỢC chứ không phải trời pha loãng. Một mình nó chỉ đưa
   * 3,44 → 3,72; phần còn lại ở `scale.lineOpacity` (xem đó). Cả hai đều
   * CỘNG ánh sáng vào nét, không trừ ánh sáng khỏi trời — cùng nguyên tắc
   * đã bỏ được cái hào.
   */
  casing: { grow: 1.6, opacity: 0.78 },
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
  /**
   * SÀN GÓC: mọi nét chòm phải cách trục ngang VÀ trục dọc ít nhất bấy nhiêu
   * độ (`bo-cuc-hung-vi.md` §6).
   *
   * Bản cũ đo được **27 trên 50 nét** vi phạm ở sàn 8° — M3 8/8, M5 7/7, M6
   * 12/12, M7 2/5, M8 1/1, M2 2/6, M1 1/7, M4 2/4. Một bầu trời mà hơn nửa
   * nét là ngang hoặc dọc là hình học của một BẢNG TÍNH, và đó là một trong
   * ba chẩn đoán cụ thể nhất của lời chê. Sau khi xoay năm chòm và vẽ lại ba
   * chòm: **0/50 ở sàn 10°**.
   *
   * Ngoại lệ duy nhất là HAI VỆT LOÉ của mặt trời (`SKY_LIGHT.flare`): chúng
   * phải vuông góc, vì đó là chữ ký của một nguồn sáng qua thấu kính. Vệt loé
   * không phải một chòm, nên luật này không áp cho nó.
   */
  axisMin: 10,
  /** SÀN TỈ LỆ đường kính bao: chòm lớn nhất : chòm nhỏ nhất.
   *
   *  Bản cũ 3,53 : 1, và **1,86 : 1** nếu bỏ M8 (M8 chỉ có 2 ngôi) — tức sáu
   *  trên tám chòm nằm trong khoảng 1,86 : 1. Đó là con số thật của lời chê
   *  "mọi chòm một cỡ", và nó là cái chữa THẬT cho "rải gần đều": chỉ số
   *  Clark–Evans của bố cục mới vẫn là R = 1,37, y hệt bố cục cũ, nên cái mắt
   *  đọc ra là ĐỀU không đến từ toạ độ mà đến từ CỠ. */
  scaleRatioMin: 5,
} as const;

/**
 * BA HÀNH TINH = BA BÀI CỬA TỰ KIỂM TRA (`bo-cuc-hung-vi.md` §7.2).
 *
 * **Nguồn dữ liệu là cờ `step_4.gate`**, đúng chỗ backend
 * (`isSelfTestGateLesson`) và frontend đang đọc. Bộ sinh ĐẾM từ cờ, không
 * viết cứng con số 3 — thêm một cửa mới là bản đồ tự mọc thêm một hành tinh,
 * đúng luật mà AGENTS.md đặt ra ("đừng viết test khoá cứng con số 3").
 *
 * **Vì sao một HÀNH TINH chứ không một ngôi sáng hơn.** Bài cửa là chỗ DUY
 * NHẤT hệ thống đổi hành vi: lời giải mẫu bị giữ lại tới khi bài được ghi
 * nhận hoàn thành. Một bài cửa không phải một bài "sáng hơn" — nó là một
 * LOẠI KHÁC. Vẽ nó bằng một ngôi to hơn là nói sai bằng hình. Vẽ nó bằng một
 * vật RẮN, có mặt sáng mặt tối, có vành đai mà mạch phụ thuộc phải xuyên qua
 * — là nói đúng.
 *
 * Và nó trả được câu hỏi thứ hai của bức: ở §4 "hùng vĩ = (một điểm tụ sáng)
 * × (một thước ở tiền cảnh) × (tỉ số cỡ lớn giữa hai cái đó) × (một hướng
 * sáng duy nhất mà MỌI vật tuân theo)". Hành tinh là vật thứ hai trong bức
 * tuân theo hướng sáng ấy — pha của nó ĐỌC RA được hướng mặt trời, mà không
 * một ký hiệu nào làm được điều đó.
 */
export const SKY_PLANET = {
  /** Đường kính = `sizeRatio` × đường kính bao của chòm, kẹp trong [min, max].
   *  Tỉ lệ theo CHÒM chứ không một con số cố định: hành tinh phải đọc ra là
   *  "một vật trong chặng này", nên nó phải cùng thang với chặng — R02 trong
   *  M3 (275 px) ra 82 px, hai bài DA trong M8 (72 px) rơi xuống kẹp dưới. */
  sizeRatio: 0.3,
  sizeMin: 28,
  sizeMax: 110,
  /**
   * PHA: `φ = base − span · (r / ref)`, tỉ lệ chiếu sáng `k = ½(1 + cos φ)`.
   *
   * Hành tinh càng GẦN mặt trời thì φ càng lớn, tức càng là một lưỡi liềm
   * mảnh — đúng như một hành tinh thật nhìn từ phía trong quỹ đạo của nó.
   * R02 ở r = 193 ra φ ≈ 136°, k ≈ 0,14: một lưỡi liềm mảnh với viền sáng
   * quay về mặt trời. Hai bài DA ở r ≈ 580 ra φ ≈ 68°, k ≈ 0,69: khuyết lồi.
   *
   * Công thức là một PHÁN ĐOÁN, không một phép đo — nhưng cái nó phải đạt thì
   * đo được: viền sáng của cả ba phải quay về (680, 313), và một ca test tính
   * lại hướng đó từ hình học của cung.
   */
  phase: { base: 170, span: 140, ref: 800 },
  /** Mặt TỐI: đĩa `dustLane` gần đặc. Mặt SÁNG: một `path` gồm ĐÚNG HAI cung
   *  tròn — cung rìa hành tinh + cung đường phân giới (ellipse bán trục
   *  `r·|cos φ|`). Không clip, không mask, không gradient: hai cung tròn là
   *  toàn bộ hình học của một pha, nên không cần gì hơn. */
  nightOpacity: 0.92,
  litOpacity: 0.88,
  /**
   * VÀNH ĐAI MANG NGHĨA, KHÔNG TRANG TRÍ.
   *
   * Mạch phụ thuộc **đi xuyên qua vành** của mỗi hành tinh cổng: vào ở nửa
   * xa, ra ở nửa gần. Đó là hình của đúng một luật hệ thống — *qua được bài
   * này mới đi tiếp* — và nó là chỗ CHE KHUẤT thuyết phục nhất trong cả bức:
   * nửa gần của vành phủ LÊN hành tinh, hành tinh phủ LÊN nửa xa của vành.
   * Hai lần che trong một vật, và che khuất là tín hiệu chiều sâu mà bản cũ
   * có **đúng 0** chỗ ("không một vật thể nào cắt đường bao của vật khác").
   */
  ring: { major: 1.9, tilt: 68, width: 1.4, opacity: 0.5 },
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
  /**
   * SÀN ĐỘ MỜ CỦA CHỮ ở bảy nhãn còn lại khi một chòm được trỏ vào.
   *
   * ── TỪ MỘT CON SỐ RIÊNG THÀNH MỘT CÁI SÀN (19/10/2026) ───────────────
   *
   * Số này ra đời làm một ĐỘ MỜ RIÊNG cho chữ, vì chữ có một sàn mà nét không
   * có: WCAG đòi 4,5:1 cho chữ và 3:1 cho hình, nên hai thứ mờ theo cùng một
   * tỉ số là một thứ sẽ trượt trước. Và nó trượt thật — bản cũ mờ cả trời lúc
   * hover nên nền sau chữ tối theo và nhãn M4 (chỗ trời sáng nhất) còn
   * 4,66:1; giữ trời nguyên thì chính nhãn ấy tụt xuống **4,36:1** ở tỉ số
   * 0,509 của nét. 0,55 đưa nó lên **4,83:1**.
   *
   * Từ lúc TÁCH TẤM (xem `build_chom`) nó không còn là một độ mờ đặt được
   * nữa: bảy chòm mờ đi bằng `opacity` của CSS trên chính thẻ `<img>` của tấm
   * NGHỈ, và một `opacity` thì mờ ĐỀU cả nét lẫn chữ — không có chỗ nào cho
   * hai tỉ số. Nên nó đổi vai thành SÀN, và cái sàn ấy quyết `dimOpacity`:
   * `dimOpacity / lineOpacity[0]` phải ≥ con số này, nên 0,28 lên 0,31
   * (tỉ số 0,5636). Script **TRƯỢT BUILD** nếu ai hạ `dimOpacity` xuống dưới
   * mức đó, và đo lại tương phản chữ ở ĐÚNG tỉ số CSS sẽ dùng.
   *
   * KHÔNG lấy 0,52 (đo ra 4,48:1, tức đúng mép): bộ đo lấy mẫu trên lưới 9×5
   * trong hộp chữ, nên nó có thể bỏ sót một điểm sáng hơn giữa hai mẫu. Dừng
   * đúng ở mép ràng buộc là tự đặt mình vào chỗ một phép lấy mẫu dày hơn sẽ
   * làm đỏ.
   */
  dimTextOpacity: 0.55,
  /** Cỡ/lệch của mã bài. KHÔNG còn vẽ vào tranh — bước 2 đã dựng mã bài bằng
   *  HTML (`.chip`) và hai bản rơi vào đúng một điểm, nên bản SVG bỏ đi (xem
   *  `ve_nhan`). Giữ hai con số vì `.chip` neo theo chúng: `codeOffset` là
   *  khoảng chéo trên-phải mà cả hai bản dùng. */
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
  /**
   * VIỀN ÔM NÉT CHỮ — thứ THAY cho tấm nền đặc, 20/10/2026.
   *
   * ── CÁI NÓ THAY, VÀ VÌ SAO ĐỔI KHÔNG PHẢI VÌ GU ────────────────────────
   *
   * Chữ nhãn giữ được 4,5 : 1 nhờ một TẤM NỀN `base` ở độ mờ 0,9 trải khắp
   * hộp chữ. Nó làm đúng việc của nó, và nó hỏng bức tranh theo đúng cái
   * cách mà cái hào quanh chòm hỏng: nó mua tương phản bằng cách TRỪ ĐI ÁNH
   * SÁNG trên một mảng CÓ MÉP. Trên nền trời đã sáng hẳn, tám (rồi chín) tấm
   * ấy đọc ra trên PNG là **chín tấm thẻ đen dán đè**. Vòng trước đã thử sửa
   * bằng HÌNH — bo góc, năm lớp tán mép — và người xem vẫn gọi đúng tên nó.
   *
   * ── VÀ MỘT PHÉP ĐO MÀ KHÔNG AI NGỜ ─────────────────────────────────────
   *
   * Tấm nền còn là nguyên nhân của một con số đã treo cờ: khoảng lệch mô
   * hình − raster ở bậc giữa nhảy **2,6 → 7,8 điểm phần trăm** đúng lượt tán
   * mép được thêm vào. Lý do: `do_sang_rgb` (mô hình) KHÔNG biết gì về tấm
   * nền, còn tệp SVG thì có — và năm lớp tán nở hộp chữ thêm 45 px mỗi phía,
   * nên chín tấm phủ một phần sáu khung. Đo bằng cách bỏ đúng 80 `<path>` ấy
   * khỏi bộ tệp rồi raster lại: bậc giữa **50,54 → 59,30 %**, đen sâu
   * **24,95 → 16,25 %**. Tức tấm nền một mình ăn 8,8 điểm phần trăm mid-tone
   * của cả bức, và "khoảng lệch" chính là nó.
   *
   * ── THỨ THAY NÓ ────────────────────────────────────────────────────────
   *
   * Hai lớp `<text>` cùng toạ độ: lớp DƯỚI vẽ cùng chuỗi chữ với một NÉT VIỀN
   * `haloWidth` px màu `base`, lớp TRÊN là chữ thật. Viền ôm lấy nét chữ nên
   * nó không có mép nào để mắt bắt được — nó đọc ra là "chữ dày hơn một
   * chút", đúng thủ pháp nhãn của mọi bản đồ in chồng lên địa hình.
   *
   * Và tương phản KHÔNG giảm: cái mà mắt so với nét chữ là màu NGAY CẠNH nó,
   * và màu ngay cạnh nó nay là viền, không phải trời. Phép đo đổi theo đúng
   * chỗ đó (`do_tuong_phan_nhan` dựng nền hiệu dụng bằng `over(trời, base,
   * haloOpacity)`), nên 24 phép đo vẫn nói về bức tranh có thật.
   *
   * `haloWidth` 3,2 px cho chữ cỡ 20 và 15: viền phải dày hơn ~1/6 cỡ chữ
   * mới phủ kín khe giữa hai nét chữ gần nhau, và mỏng hơn ~1/4 thì chữ
   * không bị bít. `haloOpacity` 0,92 — cao hơn `plateOpacity` cũ 0,90, nên
   * tương phản chữ LÊN chứ không xuống, trong khi diện tích bị dìm còn lại
   * đúng một đường biên quanh glyph.
   *
   * KHÔNG còn điều kiện "chỉ rắc ở chỗ nền sáng hơn `plateAt`": tấm nền có
   * điều kiện ấy vì tám vệt đen ở chỗ trời đã tối là tám vệt vô cớ. Một viền
   * ôm nét chữ thì ở đâu cũng đúng, và bỏ được cái nhánh ấy là bỏ luôn chỗ
   * lượt VẼ và lượt ĐO có thể lệch nhau.
   */
  haloWidth: 3.2,
  haloOpacity: 0.92,
  /**
   * BÁN KÍNH mà hộp nhãn phải tránh quanh mặt trời (§10.2 luật 1).
   *
   * Vì sao nó là một hàng rào HÌNH HỌC chứ không một phép đo độ chói: tấm nền
   * ở trên giữ được tương phản ngay cả giữa quầng, nên không phép đo tiếp cận
   * nào bắt được chuyện một nhãn ngồi lên ĐIỂM TỤ của cả bức. Cái đó phá bố
   * cục, và bố cục phải được gác bằng toạ độ.
   *
   * **210, không 250 như đặc tả §10.2 đề ra** — và nói ra vì nó là một con số
   * đã thử và trượt. Đặc tả lý lẽ rằng "bố cục đặt mọi neo nhãn ở ≥ 289 px
   * nên không nhãn nào CẦN vùng đó", nhưng chính §5.4 của nó lại đặt M3 ở
   * 176 px. Với bán kính 250, M3 KHÔNG ĐẶT ĐƯỢC nhãn: đã thử đủ 288 hộp —
   * phía trên-phải rơi vào đĩa, phía dưới là rìa chân trời, hai phía còn lại
   * giao bao lồi của chính M3. 210 = đúng `SKY_LIGHT.outer`, tức luật đọc
   * thành "không nhãn nào nằm TRONG quầng", và nó vẫn chừa trống cả vùng cấm
   * 170 cộng 40 px biên.
   */
  keepOffSun: 210,
  /**
   * HAI CÁI PHANH CỦA PHÉP LÙI (`xep_nhan` phía Python).
   *
   * Bộ máy đặt nhãn thôi chọn THAM LAM từ 19/10/2026: tám chỗ được tìm cùng
   * một lúc, và nếu chòm thứ k không còn chỗ thì chòm k−1 nhường chỗ tốt nhất
   * của nó rồi thử chỗ tốt nhì. Lý do ở `xep_nhan`: cách tham lam hỏng có hệ
   * thống khi chỗ trống hiếm, và nó hỏng với một thông báo chỉ vào NẠN NHÂN
   * chứ không vào nguyên nhân — đã xảy ra ba lần với ba cặp chòm khác nhau
   * trong một phiên.
   *
   * `branch` giữ bao nhiêu chỗ ĐIỂM CAO NHẤT mỗi chòm được đem ra thử: 8 nhãn
   * × 24 chỗ là một không gian đủ rộng để có nghiệm mà vẫn duyệt trong dưới
   * một giây. `nodeMax` là trần nút; vượt mà chưa xong thì build TRƯỢT, vì
   * "không xuất ra được một bản đồ có nhãn chồng" không đổi.
   */
  branch: 24,
  nodeMax: 400000,
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
  { key: 'M5', anchor: 'N02', dir: [1, 1], leg: 84 },
  { key: 'M8', anchor: 'DA02', dir: [-1, -1], leg: 66 },
  { key: 'M3', anchor: 'G02', dir: [1, 1], leg: 44 },
  { key: 'M4', anchor: 'X02', dir: [1, -1], leg: 34 },
  { key: 'M7', anchor: 'M01', dir: [-1, 1], leg: 34 },
  { key: 'M1', anchor: 'P01', dir: [1, 1], leg: 34 },
  { key: 'M6', anchor: 'PD01', dir: [-1, 1], leg: 34 },
  { key: 'M2', anchor: 'T04', dir: [-1, 1], leg: 34 },
] as const;

/**
 * SỐ CA CHẤM của từng bài — SINH RA, không gõ tay. Chạy
 * `py scripts/star/build_sky.py --so-ca` rồi chép khối in ra vào đây.
 *
 * ── VÌ SAO KHỐI NÀY PHẢI TỒN TẠI ──────────────────────────────────────
 *
 * Bán kính mỗi ngôi ĐÃ mang nghĩa từ đầu (`starMagnitude`), nhưng con số sinh
 * ra nó thì nằm trong `scripts/pe-v4/out-advanced/lessons/*.json` — Python đọc
 * được, trình duyệt thì không: trang bản đồ công khai và KHÔNG gọi API nào
 * (`apiFetch` gặp 401 là tự tạo tài khoản khách). Nên 48 con số nằm trong
 * tranh mà **không chỗ nào nói ra**, và một tín hiệu không ai đọc được thì
 * không làm việc gì cả — đúng bài học Slay the Spire trong
 * `design/v3/tuong-tac-ban-do.md` §2.4: một bản đồ tĩnh vẫn đáng khám phá
 * nếu mỗi điểm trên đó mang một con số người xem phải cân.
 *
 * Vì sao chép số mà vẫn an toàn: ca test `bán kính mỗi ngôi khớp số ca chấm`
 * ĐẾM LẠI từ chính giáo trình rồi so với khối này, nên một con số cũ là một ca
 * ĐỎ. Đúng khuôn `SKY_LABEL_PLACED` ở trên — một nguồn, một chỗ đọc, một ca
 * canh.
 */
export const SKY_TESTS: Record<string, number> = {
  /* M1 */ P01: 9, P02: 9, P03: 10, P04: 8, P05: 12, P06: 7, P07: 6,
  /* M2 */ T01: 8, T02: 8, T03: 7, T04: 9, T05: 13, T06: 8,
  /* M3 */ G01: 7, G02: 9, G03: 9, G04: 9, G05: 11, G06: 8, R02: 17,
  /* M4 */ X01: 6, X02: 10, X03: 9, X04: 8, X05: 9,
  /* M5 */ N01: 9, N02: 8, N03: 7, N04: 8, N05: 8, N06: 8,
  /* M6 */ PD01: 8, PD02: 8, PD03: 8, PD04: 8, PD05: 8, PD06: 8, PD07: 8, PD08: 8, PD09: 8,
  /* M7 */ M01: 9, M02: 9, M03: 8, M04: 7, M05: 9, M06: 6,
  /* M8 */ DA01: 19, DA02: 14,
};

/**
 * TÊN BÀI THẬT của 48 bài — SINH RA, không gõ tay. Chạy
 * `py scripts/star/build_sky.py --ten-bai` rồi chép khối in ra vào đây.
 *
 * ── ĐÂY LÀ "CÁI GÌ BỊ GIỮ LẠI" ────────────────────────────────────────
 *
 * `design/v3/tuong-tac-ban-do.md` đo được rằng bảy bản đồ game được khảo đều
 * giữ lại một thứ cho tỉ lệ gần. Bản đồ này trước nay không giữ gì cả: ở tỉ lệ
 * xa mỗi ngôi mang MÃ bài (`P03`), và phóng vào thì vẫn đúng cái mã ấy, to
 * hơn. Tức cú phóng sẽ là phóng to một bức ảnh.
 *
 * Tên bài là thứ CHỈ có ở tỉ lệ gần, và nó không vẽ vào tranh được: 48 cái tên
 * tiếng Việt dài 20–45 ký tự trên một bầu trời 1360 × 820 là một bảng chữ, và
 * `kiem_tuong_phan_nhan` sẽ trượt build ngay vì không còn chỗ nào đặt được.
 * Nên nó là CHỮ HTML ở lớp chồng, hiện khi và chỉ khi đang phóng.
 *
 * Vì sao chép 48 chuỗi mà vẫn an toàn — cùng lý do `SKY_TESTS` an toàn: trang
 * này KHÔNG GỌI API nào (`apiFetch` gặp 401 là tự tạo tài khoản khách, và đây
 * là trang ai cũng vào được), nên dữ liệu phải ở trong mã; và một ca test ĐỌC
 * LẠI 48 tệp `scripts/pe-v4/out-advanced/lessons/*.json` rồi so TỪNG chuỗi,
 * nên một cái tên cũ là một ca ĐỎ.
 *
 * Tiền tố mã bài ĐÃ CẮT (`P01 · Program…` → `Program…`): chip ở tỉ lệ gần có
 * một ô riêng cho mã bài, nên để nguyên tiền tố là in `P01` hai lần cạnh nhau.
 */
export const SKY_TITLES: Record<string, string> = {
  /* M1 */ P01: 'Program, process và tài nguyên', P02: 'Vòng đời, fork, exec và wait', P03: 'Scheduling và context switch', P04: 'stdin, stdout, stderr và pipe', P05: 'subprocess.run và kết quả', P06: 'Popen, communicate và timeout', P07: 'multiprocessing: Process và Queue',
  /* M2 */ T01: 'Thread, tài nguyên và concurrency', T02: 'Thread target, start và join', T03: 'Subclass Thread', T04: 'GIL, CPU-bound và I/O-bound', T05: 'Lock, race condition và deadlock', T06: 'Queue và tác vụ lưu nền',
  /* M3 */ G01: 'GUI, CLI và cửa sổ', G02: 'Widget và callback', G03: 'Dữ liệu nhập và lựa chọn', G04: 'Layout: pack, place, grid', G05: 'OOP và tách logic khỏi giao diện', G06: 'Event loop và worker nền', R02: 'Dự án PW5–PW9: lưu, shell, thread và GUI',
  /* M4 */ X01: 'Nhập dữ liệu bằng NumPy và pandas', X02: 'Excel, Stata, SAS, HDF5 và MATLAB', X03: 'SQL với sqlite3 và pandas', X04: 'Matplotlib: dữ liệu và loại biểu đồ', X05: 'Matplotlib: tùy chỉnh và xuất',
  /* M5 */ N01: 'Array, dtype, shape và axis', N02: 'Indexing, mask và vectorization', N03: 'Broadcasting và chuẩn hoá dữ liệu', N04: 'Thống kê, NaN và trọng số', N05: 'View, copy và sai số số thực', N06: 'Đọc dữ liệu và mô phỏng tái lập',
  /* M6 */ PD01: 'Series, DataFrame và index', PD02: 'CSV, Excel và schema', PD03: 'Làm sạch thiếu, trùng và sai kiểu', PD04: 'Lọc, tính cột và cập nhật an toàn', PD05: 'GroupBy và KPI có mẫu số rõ ràng', PD06: 'Merge, concat và kiểm tra cardinality', PD07: 'Long, wide, pivot và melt', PD08: 'Ngày giờ, resample và rolling', PD09: 'EDA, chất lượng dữ liệu và export',
  /* M7 */ M01: 'Figure, Axes và chọn biểu đồ', M02: 'Phân bố, scatter và outlier', M03: 'Subplot và heatmap đọc được', M04: 'Màu, annotation và kể chuyện dữ liệu', M05: 'Ticks, scale và ngày trên trục', M06: 'Layout, xuất hình và kiểm tra chất lượng',
  /* M8 */ DA01: 'Mini-project: doanh thu từ raw tới chart', DA02: 'Mini-project: điểm số và GPA',
};

/**
 * HÌNH HỌC CÚ PHÓNG — ĐÓNG BĂNG, sinh bởi
 * `py scripts/star/build_sky.py --phong`. Luật sinh ra nó ở `SKY_ZOOM`.
 *
 * Ba con số mỗi chòm: `scale` là hệ số, `cx`/`cy` là tâm khung (0..1) sau khi
 * đã KẸP để cửa sổ thấy được không bao giờ ra ngoài bức tranh.
 *
 * Vì sao đóng băng ở đây chứ không tính trong TS: hộp đích gồm cả HỘP NHÃN, mà
 * hộp nhãn chỉ Python đo được — nó cần bề rộng chữ. Đúng khuôn
 * `SKY_LABEL_PLACED` và `SKY_TESTS`: một nguồn, một chỗ đọc, một ca test tính
 * lại từ chính tranh rồi so.
 *
 * Và nó phải đọc được từ JS, không chỉ từ CSS: `SkyCursor.tsx` ĐẢO phép biến
 * hình để biết con trỏ đang ở toạ độ khung nào lúc đang phóng. Không có ba con
 * số này thì vòng dò nhận SAI ngôi — một bản đồ phóng vào rồi chỉ sai chỗ còn
 * tệ hơn một bản đồ không phóng.
 */
export const SKY_ZOOM_PLACED = [
  { key: 'M1', scale: 1.6, cx: 0.3125, cy: 0.66934 },
  { key: 'M2', scale: 2.662, cx: 0.71422, cy: 0.81217 },
  { key: 'M3', scale: 2.193, cx: 0.46215, cy: 0.74512 },
  { key: 'M4', scale: 2.273, cx: 0.26477, cy: 0.21998 },
  { key: 'M5', scale: 2.708, cx: 0.80229, cy: 0.56468 },
  { key: 'M6', scale: 2.515, cx: 0.80119, cy: 0.34573 },
  { key: 'M7', scale: 3.021, cx: 0.83086, cy: 0.16551 },
  { key: 'M8', scale: 3.2, cx: 0.64689, cy: 0.15625 },
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
 * TỈ LỆ THỨ HAI — ba con số cho cú phóng (`?chang=M<k>`).
 *
 * ── VÌ SAO CÓ TỈ LỆ THỨ HAI ───────────────────────────────────────────
 *
 * `design/v3/tuong-tac-ban-do.md` khảo bảy bản đồ game và tìm ra ba thứ mà
 * bản đồ này thiếu cả ba: **một động từ có hậu quả · hai tỉ lệ trở lên · cái
 * gì bị giữ lại**. Bước này cấp hai thứ sau. Và nó phải cấp CẢ HAI cùng lúc,
 * vì một mình "hai tỉ lệ" là phóng to một bức ảnh: ở tỉ lệ gần phải hiện ra
 * thứ tỉ lệ xa không có (tên bài thật, thứ tự học, số ca) — xem `SKY_TITLES`.
 *
 * ── VÌ SAO BA CON SỐ NÀY Ở ĐÂY, KHÔNG Ở CSS ───────────────────────────
 *
 * Hình học của cú phóng (hệ số và tâm từng chòm) ĐÓNG BĂNG ở
 * `SKY_ZOOM_PLACED`, sinh bởi `py scripts/star/build_sky.py --phong`. Ba con
 * số dưới đây là LUẬT sinh ra nó, nên chúng ở TS — đúng luật 1 của bộ sinh:
 * hình thái ở TS, Python không biết gì.
 */
export const SKY_ZOOM = {
  /** Hộp đích nở thêm bấy nhiêu đơn vị khung, để chòm không dính mép. */
  pad: 34,
  /**
   * TRẦN HỆ SỐ. M8 chỉ có hai ngôi nên hộp của nó bé và `min(W/w, H/h)` cho ra
   * hơn 6 lần — ở mức đó hai ngôi cách nhau nửa màn và cú phóng thành một cú
   * rơi. Trần giữ cho tám chặng ở CÙNG một bậc tỉ lệ, tức chữ "gần" nghĩa như
   * nhau ở cả tám.
   */
  maxScale: 3.2,
  /**
   * SÀN HỆ SỐ. M6 (9 ngôi, cái bàn rộng nhất) tự nhiên chỉ phóng được ~1,9
   * lần. Sàn tồn tại để một chặng rộng vẫn phải ĐI ĐƯỢC một đoạn: biên độ
   * dưới ~1,4 lần thì mắt đọc ra "hình nhích một chút", không ra "tôi vừa đi
   * tới một chỗ khác" — và lúc đó cái động từ mất hậu quả.
   */
  minScale: 1.6,
} as const;

/**
 * LỚP CON TRỎ (`SkyCursor.tsx`) — mọi con số của "con trỏ có mặt trong bức
 * tranh". Ở TS chứ không ở CSS vì ca test phải so được hai chỗ: `stagger` sinh
 * ra tám dòng `transition-delay` trong CSS, và một con số lệch ở đó là một thứ
 * tự người xem thấy mà không ai đỏ.
 *
 * Nghiên cứu: `design/v3/tuong-tac-ban-do.md` §3 (phản hồi · chuyển cảnh · sự
 * sống nền) và §6.1–§6.2. Đây là NHÓM A — phản hồi, do tay người dùng khởi
 * động và kết thúc đúng lúc tay rời đi. Không một con số nào ở đây tạo ra một
 * hiệu ứng tự chạy: trang nạp xong vẫn đứng yên tuyệt đối.
 */
export const SKY_CURSOR = {
  /**
   * BÁN KÍNH NHẬN, tính trong khung 1360 × 820: ngoài khoảng này thì KHÔNG
   * ngôi nào tự nhận mình, và vòng dò nói ra điều đó bằng cách trống.
   *
   * Vì sao có một bán kính chứ không "luôn lấy ngôi gần nhất": chú giải đã
   * khẳng định "khoảng tối giữa hai chòm không thuộc về chặng nào — ở đó không
   * có bài nào". Nhận một ngôi cách 400 px là nói ngược lại câu đó. 64 px ≈
   * 1,3 lần khe nhỏ nhất giữa hai ngôi (đo được 48,4 px, T02–T03), nên trong
   * một chòm thì luôn có ngôi nhận, còn giữa hai chòm thì có chỗ trống thật.
   */
  claimRadius: 64,
  /** Bán kính vòng dò, px CSS. Lớn hơn quầng sao lớn nhất (r 5,37 × 3,2 ≈ 17
   *  px khung ≈ 13 px CSS) để nó bao được ngôi chứ không nằm trong ngôi. */
  ringRadius: 17,
  /** Dấu ngôi: đường kính px CSS của vòng mảnh vẽ quanh ngôi được nhận. */
  markSize: 22,
  /**
   * TIẾT LỘ CÓ THỨ TỰ — ba con số, và thứ tự của chúng LÀ cái tin.
   *
   * `tileIn` (150 ms): tấm chòm được trỏ hiện lên TRƯỚC, nhanh. Việc đầu tiên
   * bản đồ phải trả lời là "tay tôi đang ở chặng nào".
   *
   * `tileOutDelay` (120 ms): bảy chòm kia mới bắt đầu lùi lại, SAU khi cái
   * được chọn đã tới. Trước đây hai việc này xảy ra cùng một nhịp 320 ms với
   * cùng một đường cong — tức một cái công tắc có bóng đèn chậm, đúng như
   * nghiên cứu §3 gọi tên.
   *
   * `stagger` (45 ms): mã bài của từng ngôi bật lên LẦN LƯỢT, theo THỨ TỰ BÀI.
   * Đây là chuyển động duy nhất ở đây mang một tin mới: bản đồ cố ý không vẽ
   * mũi tên lộ trình (chú giải: "nó không nói thứ tự phải học"), nên thứ tự
   * trong một chặng trước nay KHÔNG đọc được ở đâu cả. Chòm dày nhất có 9 ngôi
   * ⇒ bậc cuối tới ở 150 + 8 × 45 = 510 ms, dưới một cú nhìn.
   */
  lead: { tileIn: 150, tileOutDelay: 120, codeDelay: 150, stagger: 45 },
  /**
   * CÚ PHÓNG LÀ MỘT CHUYẾN ĐI, không phải một lần đổi ảnh.
   *
   * Chủ sản phẩm xem màn phóng gần ngày 19/10/2026: "cải tiến cả hoạt ảnh khi
   * bấm vào này nữa". Bản trước là MỘT bước chuyển đơn — cả mười chín tấm và
   * lớp con trỏ cùng chạy một `transform` 450 ms `ease-out`, tức đúng cái mà
   * nghiên cứu §3 gọi là "một cái công tắc có bóng đèn chậm", chỉ ở quy mô cả
   * bức tranh. Nay nó có BA NHỊP, và thứ tự ba nhịp ấy LÀ cái tin:
   *
   *  1. `recede` (130 ms, trễ 0) — bảy chòm kia lùi về `--sky-mo` NGAY. Việc
   *     đầu tiên của một chuyến đi là rời chỗ cũ.
   *  2. `travel` (360 ms) sau `travelDelay` (70 ms) — cú đi. Trễ 70 ms để mắt
   *     kịp thấy bảy chòm kia bắt đầu lùi TRƯỚC khi khung bắt đầu chạy; không
   *     có nó thì ba nhịp thành một nhịp.
   *  3. `arrive` (180 ms) sau `arriveDelay` (190 ms) — chòm ĐÍCH rõ lên (tấm
   *     nghỉ tắt, tấm rõ hiện) khi cú đi đã qua nửa đường. Tới một chỗ thì
   *     chỗ ấy phải sáng lên lúc ta tới, không phải lúc ta còn đang đi.
   *
   * `curve` là đường cong "KHỞI HÀNH RỒI DỪNG LẠI": vào có gia tốc (0,34 ở
   * đầu) và ra dừng hẳn (0,2 → 1). `ease-out` của bản trước xuất phát ở tốc
   * độ cao nhất, tức bức tranh đã đang chạy trước khi tay kịp rời chuột — một
   * cú giật, không một cú khởi hành.
   *
   * `chipDelay`/`chipStagger`: thẻ bài vào SAU CHÒM ĐÍCH, theo THỨ TỰ BÀI
   * (thẻ thứ 9 tới ở 230 + 8 × 20 = 390 ms, xong ở 570 ms). Chòm dày nhất 9
   * ngôi nên cả cú phóng đóng lại dưới 0,6 s — người ta sẽ bấm nhiều lần, và
   * một hoạt ảnh dài là một hoạt ảnh phiền ở lần thứ ba.
   *
   * `out` là lượt VỀ, và nó CỐ Ý gọn hơn lượt đi (320 ms, không trễ, không
   * nhịp): lùi ra là một việc muốn xong, không một chuyến đi.
   */
  zoom: {
    recede: 130,
    travel: 360,
    travelDelay: 70,
    arrive: 180,
    arriveDelay: 190,
    chipDelay: 230,
    chipStagger: 20,
    curve: 'cubic-bezier(0.34, 0.03, 0.2, 1)',
    out: 320,
  },
} as const;

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
  /**
   * Hệ số theo hồ sơ. ĐÂY là chỗ duy nhất bán kính/độ dày/độ mờ được phép
   * khác nhau giữa hai bản — bảng §19.3, không thêm dòng nào.
   *
   * ── KHOÁ `skyDim` ĐÃ BỊ BỎ ngày 19/10/2026 ──────────────────────────
   *
   * Nó từng là hệ số mờ áp cho CẢ BA tấm trời lúc trỏ vào (0,62), và đừng
   * dựng lại — nó đã gây ra đúng lời chê "tại sao khi hover thì nó lại XÁM đi
   * chứ không phải MỜ đi".
   *
   * Nguyên nhân trực tiếp là một cái nền sai: `.frame` tô `var(--ds-page)`,
   * mà bản sáng của token đó là `#EAEFF6`. Hạ độ mờ của một lớp TỐI trên nền
   * SÁNG không làm nó tối hơn — nó làm nó NHẠT thành xám sữa. Đo được: chỗ
   * trời tối nhất đi từ L = 0,0038 lên **0,1226**, tức sáng gấp 32 lần. Nền
   * đã sửa thành chính `base` của hồ sơ (qua `--sky-base`, xem `--css`).
   *
   * Nhưng sửa nền rồi thì cách làm này vẫn SAI, và đây là lý do bỏ hẳn: mờ cả
   * trời là mờ luôn tinh vân, dải Ngân Hà và mạch hoàng đạo — tức mờ đúng cái
   * LIÊN KẾT giữa tám chòm, ngay lúc người ta đang chọn. Đo trên chính bức
   * này: tương phản lõi Ngân Hà / trời trống tụt từ **15,8:1 xuống 6,4:1**
   * (mất 59% tín hiệu), trong khi tỉ số hình/nền mà nó mua được chỉ nhích từ
   * 4,18:1 lên 4,36:1 (**+3%**, đo ở M1). Và giả thuyết "mờ trời để bảy chòm
   * kia còn giữ 3:1" thì đo ra là sai: tương phản xấu nhất của nét mờ với
   * trời là 1,87:1 ở CẢ HAI cách. Nên toàn bộ việc làm nổi nay nằm ở lớp
   * CHÒM: chòm được trỏ 0,55 → 0,85, bảy chòm kia → `dimOpacity`.
   */
  scale: {
    /** Bán kính 48 ngôi: 1,00 (tối) · 1,08 (sáng). */
    star: number;
    /** Bề rộng nét chòm: 1,15 px (tối) · 1,00 px (sáng). */
    line: number;
    /** [nghỉ, hover] của nét chòm. */
    lineOpacity: [number, number];
    /** Nét của BẢY CHÒM CÒN LẠI khi một chòm được trỏ vào: 0,55 → 0,31
     *  (§10 hiệu ứng 3). Tách hình khỏi nền bằng TƯƠNG PHẢN, không bằng
     *  chuyển động. ĐÂY LÀ TOÀN BỘ hiệu ứng làm nổi — xem chú thích "khoá
     *  `skyDim` đã bị bỏ" ở `SkyProfile` dưới.
     *
     *  NÓ KHÔNG CÒN ĐẶT TỰ DO ĐƯỢC: từ lúc tách tấm, bảy chòm mờ đi bằng
     *  `opacity` của CSS trên tấm NGHỈ, nên tỉ số `dimOpacity / lineOpacity[0]`
     *  mờ luôn cả CHỮ của nhãn — và chữ có sàn 4,5:1. Xem
     *  `SKY_LABEL.dimTextOpacity`; script trượt build nếu tỉ số xuống dưới sàn
     *  ấy. 0,28 (giá trị cũ) cho 0,509 và nhãn M4 đo ra 4,36:1. */
    dimOpacity: number;
    /** Độ mờ của hình khắc dụng cụ lúc hover (lớp E — chưa dựng ở bản mẫu). */
    figureOpacity: number;
  };
  /** Nền tuyệt đối. */
  base: string;
  /** Sáu lớp tinh vân, từ xa về gần (§3.1). */
  dustFar: string;
  nebula: string;
  nebulaCore: string;
  /** Tông tinh vân SÁNG, cho mười bậc giữa của hai mươi hai
   *  (`SKY_NEBULA.ramp`). Khoá MỚI: hai tông cũ tô đặc mới đạt L = 0,062, tức
   *  không với tới bậc 0,18–0,35 mà ngân sách §5.2 đòi 5,4 % diện tích. */
  nebulaLit: string;
  /** Tông tinh vân SÁNG NHẤT, cho ba bậc trong cùng. Cùng lý lẽ với
   *  `nebulaLit`, lùi lên một bậc: `nebulaLit` tô ĐẶC mới đạt L = 0,498, nên
   *  một chồng bậc α 0,12 dừng ở ~0,36 và bậc "rìa quầng" 0,35–0,60 nằm ngoài
   *  tầm của bảng màu cũ. */
  nebulaPeak: string;
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
  /** Rìa ngoài quầng — ngà ẤM, L ≈ 0,62. Khoá MỚI, và nó THAY `glow` ở nguồn
   *  sáng: `glow` có L = 0,0896, tối hơn xám trung tính `#808080` (0,2159) hai
   *  lần rưỡi, nên mười vòng quầng của bản cũ đang HẠ độ chói vùng chúng phủ. */
  glowRim: string;
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
    /**
     * [nghỉ, hover] — 0,55 → **0,70** ngày 20/10/2026, cùng lượt với
     * `SKY_LINK.casing.opacity`.
     *
     * Nét chòm đo được 3,44 : 1 lúc nghỉ, vừa trên sàn 3 : 1 của WCAG
     * 1.4.11 — và một sàn là mức TỐI THIỂU ĐỌC ĐƯỢC, không phải mức mà
     * thứ MANG NGHĨA chính của bức nên có. Trên PNG nó đọc ra đúng thế:
     * M2 (giữa-dưới) và M7 (phải) gần như chìm vào tinh vân.
     *
     * Đây là lever MẠNH NHẤT và cũng là lever đúng chỗ nhất: tương phản
     * đo giữa LÕI và VỎ, nên nó là độ mờ của chính cái lõi. 0,70 đưa chỗ
     * tệ nhất lên 5,2 : 1 và trung vị 4,37 → 5,91. Không một điểm trời
     * nào bị dìm để đổi lấy con số ấy.
     *
     * `dimOpacity` PHẢI lên theo: `kiem_mo_css` đòi
     * `dimOpacity / lineOpacity[0] ≥ SKY_LABEL.dimTextOpacity` (0,55), vì
     * cùng một `opacity` CSS mờ cả nét lẫn CHỮ của bảy chòm không được
     * trỏ. 0,40 / 0,70 = 0,5714 — nhỉnh hơn 0,5636 cũ, tức chữ lúc mờ
     * còn đọc tốt hơn một chút.
     */
    lineOpacity: [0.7, 0.88],
    dimOpacity: 0.4,
    figureOpacity: 0.13,
  },
  base: '#0A0C14',
  /** HAI TÔNG NỀN TRỜI NÂNG LÊN ngày 19/10/2026, và cả hai là phép đo.
   *
   *  Bảng chẩn đoán của lời chê thứ năm: **89,7 %** diện tích ở L < 0,01 so
   *  với 20,5 % của khung tham chiếu, và 6,8 % ở bậc "nền trời" 0,01–0,03 so
   *  với 23,1 %. Lý do đo được: `dustFar` `#1A1E2E` ở độ mờ tích luỹ 0,49 chỉ
   *  đạt L ≈ 0,0085 — tức **cả lớp bụi xa đang nằm trong bậc "đen sâu"**. Một
   *  lớp phủ nửa bầu trời mà không nhấc được một điểm nào ra khỏi bậc thấp
   *  nhất thì nó không tồn tại với mắt. `#262C40` đưa nó lên L ≈ 0,0116, tức
   *  vào đúng bậc nó phải ở. */
  dustFar: '#7B84A8',
  nebula: '#303852',
  nebulaCore: '#5B6480',
  /** Tông tinh vân SÁNG NHẤT — khoá MỚI (`bo-cuc-hung-vi.md` §8.1).
   *
   *  Ba bậc trong cùng của mười bốn bậc tô bằng nó. Nó là thứ cho tinh vân
   *  với tới bậc 0,18–0,35, chỗ mà hai tông cũ không với tới được (xem
   *  `SKY_NEBULA.ramp`). Lạnh và nhạt chứ không no: §10.4 đo bão hoà bản này
   *  0,387 so với 0,197 của tham chiếu, nên một tông mới KHÔNG được no thêm. */
  nebulaLit: '#AFBCD4',
  /** Tông tinh vân SÁNG NHẤT — khoá MỚI 20/10/2026.
   *
   *  Ba bậc trong cùng của hai mươi hai tô bằng nó, và nó là thứ đưa đỉnh
   *  tinh vân từ L 0,173 lên 0,448 — tức ra khỏi bậc 0,08–0,18 và vào tận bậc
   *  "rìa quầng" 0,35–0,60, chỗ bức hụt nặng nhất (−5,2 điểm phần trăm).
   *  Bão hoà HSV 0,085: nhạt chứ không no, theo đúng luật ở `nebulaLit`. */
  nebulaPeak: '#E6ECF6',
  dustLane: '#0D101C',
  filament: '#8E92BE',
  horizon: '#2A2416',
  glow: '#4E5468',
  glowCore: '#F6F1E2',
  /** Rìa ngoài quầng mặt trời — khoá MỚI, ngà ẤM hơn `glowCore`, L ≈ 0,62.
   *
   *  Nó thay `glow` `#4E5468` ở nguồn sáng, và đó là nguyên nhân #1 của "mặt
   *  trời không chói": `glow` có L = 0,0896, **tối hơn xám trung tính
   *  `#808080` (0,2159) hai lần rưỡi**, mà mười trong mười sáu vòng của bản cũ
   *  tô bằng nó. Một quầng tối hơn xám thì không thể sáng. `glow` được GIỮ
   *  trong hồ sơ cho chỗ khác còn dùng, nhưng nguồn sáng thì không. */
  glowRim: '#D8C9A8',
  hullCeiling: '#4B5680',
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
  /**
   * GÓC XOAY của cả hình, độ, quanh TÂM LƯỚI. Mặc định 0.
   *
   * Nó là phép chữa cho tính CĂN TRỤC (`SKY_LINK.axisMin`): bản cũ có **27
   * trên 50 nét** nằm trong 8° của trục ngang hay trục dọc, tức một bầu trời
   * mà phần lớn nét là ngang hoặc dọc — hình học của một sơ đồ, không của một
   * bầu trời. Năm chòm (M1 M2 M4 M7 M8) chữa bằng xoay vì hình của chúng vốn
   * không phải lưới; ba chòm phải ĐỌC RA là lưới/bảng/khung (M3 M5 M6) thì
   * xoay không chữa được — một hình chữ nhật xoay vẫn là hình chữ nhật — nên
   * chúng được vẽ lại bằng HỘI TỤ.
   *
   * Xoay bảo toàn hình hoàn toàn, nên mọi ca test về NGHĨA của hình vẫn xanh.
   */
  rotate?: number;
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
  /**
   * CÁNH TRÁI–DƯỚI và chòm LỚN NHẤT bản đồ (`bo-cuc-hung-vi.md` §5.4).
   *
   * Tám chòm nay dồn thành BỐN KHỐI hai cánh quanh một mặt trời ở giữa, chứ
   * không rải tám chấm: trái–trên (M4) · trái–dưới (M1) · phải–trên chụm ba
   * (M6 M7 M8) · phải–dưới (M2, M5), và M3 đứng một mình ở giữa–dưới làm tiền
   * cảnh. Giữa khung là **cột ánh sáng** — từ mặt trời thẳng xuống chân trời,
   * không một chòm nào.
   *
   * Hộp này TO HƠN hộp §5.4 đề ra (`[71, 413, 329, 324]`), và lý do là một
   * phép đo: hộp ấy cho đường kính bao 319 px, mà M8 sau khi xoay cho 72 px —
   * tỉ lệ 4,45 : 1, DƯỚI sàn 5,0 : 1 mà chính §12 bước 3 đặt ra. Đặc tả tự
   * ghi M1 = 400 px nhưng hộp của nó không chứa nổi con số đó. Nới ra
   * 380 × 400 (lên phía trên, nơi chỉ có trời trống giữa M4 và M1, KHÔNG sang
   * phải — phía phải là khe M1–M3, cặp chật nhất của cả bố cục).
   */
  box: [14, 340, 372, 392],
  grid: [100, 195],
  /**
   * XOAY +23° — phép chữa cho tính CĂN TRỤC, không phải một góc chọn cho đẹp.
   *
   * ĐÂY LÀ CHÒM CHẬT NHẤT về góc, và nói ra con số thật chứ đừng chép con số
   * của đặc tả: `bo-cuc-hung-vi.md` §6.4 đề +48°, nhưng dựng rồi ĐO lại thì
   * 48° cho ra ba nét vi phạm (P04–P07 ở 9,7°, P02–P05 ở 7,0°, P06–P07 ở
   * 3,7°). Lý do đặc tả lệch: bảy nét của M1 có góc 90 · 55 · 79 · 142 ·
   * 125 · 101 · 38, và chúng chỉ cách nhau vài độ theo modulo 90 — nên tập
   * góc xoay ĐẠT chỉ gồm hai cửa sổ rộng ~4°: [21°, 25°] và [65°, 69°].
   *
   * +23° là tâm cửa sổ thứ nhất, cho biên an toàn **12,0°** trên sàn 10° —
   * biên LỚN NHẤT mà hình này cho phép. Góc nét sau khi xoay: 113 · 78 · 102 ·
   * 165 · 148 · 124 · 61. Ai đổi con số này 3° theo bất cứ chiều nào cũng
   * trượt `kiem_bo_cuc`.
   *
   * XOAY KHÔNG ĐỔI NGHĨA — hình bảo toàn hoàn toàn, nên ca test `hình M1
   * "Kẹp"` (một cán, hai càng rời rồi gặp lại) vẫn xanh. Đó là lý do xoay
   * được ưu tiên hơn vẽ lại ở năm chòm: vẽ lại là phải biện hộ lại NGHĨA,
   * xoay thì không.
   */
  rotate: 23,
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
  /** Cánh PHẢI–DƯỚI (§5.4). */
  box: [930, 584, 319, 169],
  grid: [100, 100],
  /** XOAY +23°: hai cung của con thoi chạy ở 173° và 7°, tức hai nét nằm gần
   *  như ĐÚNG trên trục ngang. Đặc tả §6.4 đề +15°, nhưng đo lại thì 15° vẫn
   *  để T02–T03 ở **7,9°** — dưới sàn. +23° cho biên 14,9°. */
  rotate: 23,
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
  /** GIỮA–DƯỚI, một mình, làm TIỀN CẢNH (§5.4).
   *
   *  **Đây là chỗ hẹp nhất của cả bố cục:** ngôi `G05` chỉ cách tâm mặt trời
   *  176 px trên sàn cấm 170. Khung 1360 × 820 với một quầng bán kính 210 ở
   *  giữa thật sự chật. Ai dịch M3, dịch mặt trời, hay nới `SKY_LIGHT.outer`
   *  đều phải chạy lại cả bốn phép kiểm của `--do` (đĩa cấm, đĩa mềm, khe
   *  ngôi–ngôi, chân trời). Nếu `outer` phải lên trên 210 thì M3 buộc phải
   *  nhỏ lại hoặc lùi sang trái — không có cách thứ ba. */
  box: [380, 478, 228, 266],
  grid: [100, 100],
  /**
   * VẼ LẠI, không xoay — và phân biệt hai phép chữa vì chúng chữa hai bệnh
   * khác nhau (`bo-cuc-hung-vi.md` §6).
   *
   * XOAY giết tính CĂN TRỤC. HỘI TỤ (phối cảnh) giết tính "MÁY VẼ". M3 phải
   * đọc ra là một cái khung, mà **xoay một hình chữ nhật thì nó vẫn là hình
   * chữ nhật** — mắt vẫn đọc ra "đồ thị do máy vẽ". Hình cũ có **8/8 nét** nằm
   * trong 8° của một trục; đó là hình học của một bảng tính, không của một
   * bầu trời.
   *
   * Giữ NGHĨA: một khung cửa sổ có thanh chia và một bài cửa ở tâm. Phá HÌNH
   * HỌC: nghiêng, lệch, **bỏ hẳn cạnh trái** nên khung không khép kín, và
   * thanh chia **không thẳng đứng**. `G05` nhô CAO HƠN cạnh trên nên cạnh trên
   * gãy làm hai; `G03` thụt vào nên cạnh phải nghiêng 103°.
   *
   * Góc nét đo được: 16° 27° 103° 160° 137° 103° 106° — nét gần trục nhất cách
   * **16°**.
   */
  stars: [
    { code: 'G01', x: 10, y: 14, role: 'góc trên-trái' },
    { code: 'G02', x: 88, y: 14, role: 'góc trên-phải' },
    { code: 'G03', x: 72, y: 84, role: 'góc dưới-phải — thụt vào' },
    { code: 'G04', x: 4, y: 70, role: 'góc dưới-trái' },
    { code: 'G05', x: 60, y: 0, role: 'đầu thanh chia — nhô cao hơn cạnh trên' },
    { code: 'G06', x: 34, y: 98, role: 'chân thanh chia' },
    { code: 'R02', x: 49, y: 47, role: 'tâm — bài cửa' },
  ],
  /** BẢY nét, không tám: **không có `G04–G01`** — khung MỞ về phía người xem.
   *  Một khung khép kín là một hình chữ nhật; một khung hở là một cái khung
   *  nhìn chếch. */
  lines: [
    ['G01', 'G05'],
    ['G05', 'G02'],
    ['G02', 'G03'],
    ['G03', 'G06'],
    ['G06', 'G04'],
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
  /** Cánh TRÁI–TRÊN (§5.4). */
  box: [100, 43, 269, 243],
  grid: [100, 100],
  /** XOAY +16°: góc nét trước là 41 90 139 90 — HAI nét ở đúng 90°, tức cái
   *  cổ phễu và cái vòi là hai nét thẳng đứng tuyệt đối. Sau khi xoay:
   *  57 106 155 106, không nét nào dưới 10°. */
  rotate: 16,
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
  /**
   * CHÂN THẤP NHẤT của mạch phụ thuộc ở cánh phải.
   *
   * §5.4 đặt M5 (1030, 450) · M6 (1175, 250) · M7 (985, 105) · M8 (1220, 95),
   * và bốn toạ độ ấy KHÔNG DÙNG ĐƯỢC — nói ra vì nó là một va chạm đặc tả
   * không báo trước. Mạch hoàng đạo đi theo đúng thứ tự phụ thuộc
   * NumPy → pandas → Matplotlib → dự án, tức M5 → M6 → M7 → M8; với bốn tâm
   * trên thì cung phải đi phải, rồi quặt sang TRÁI 190 px, rồi quặt lại sang
   * phải — một chữ S tự cắt, không phải một cung lớn. Và "một cung lớn nét
   * đứt xuyên qua một tập con chòm" là TOÀN BỘ lý do mạch được vẽ như hoàng
   * đạo: một đường gấp khúc đọc ra là một lộ trình, mà khoá này không có lộ
   * trình đó.
   *
   * Nên cánh phải xếp thành một CUNG ĐƠN ĐIỆU dâng lên từ dưới-trái sang
   * trên-phải: M5 (960, 460) → M6 (1160, 320) → M7 (1215, 160) → M8
   * (1290, 60). Cỡ giảm dần theo đúng thứ tự ấy (225 → 190 → 117 → 72 px),
   * nên cung cũng là một phát biểu về KHOẢNG CÁCH: càng về cuối khoá càng xa.
   */
  box: [894, 380, 217, 140],
  /**
   * Lưới dọc BÓP XUỐNG 0,62 — và con số ấy là một PHẦN CỦA HÌNH, không phải
   * một tham số tự do.
   *
   * `grid` cao 64,5 chứ không 100 vì toạ độ `y` dưới đây đã nhân sẵn 0,62.
   * Ép `y` xuống làm góc nghiêng của hai hàng giảm, và lần dựng thử đầu tiên
   * (chưa bù) cho ra **4/7 nét ở 7–9°** — tức vừa chữa xong tính căn trục đã
   * dựng lại nó ở chỗ khác. Toạ độ dưới đây đã bù sẵn cho phép bóp đó.
   *
   * 100 : 64,5 = 1,55 = đúng tỉ lệ hộp 217 : 140, nên hình dùng HẾT hộp theo
   * cả hai chiều — `placeStar` ăn tỉ lệ ĐỒNG DẠNG nên một lưới vuông trong
   * một hộp bè sẽ bỏ trống hai bên.
   */
  grid: [100, 64.5],
  /**
   * VẼ LẠI thành LƯỚI MỘT ĐIỂM TỤ (§6.2) — cùng lý lẽ với M3: hình cũ có
   * **7/7 nét** trong 8° của một trục.
   *
   * Giữ NGHĨA: 2 hàng × 3 cột, ba thanh ray nối hàng — `ndarray` là một lưới
   * KHÔNG nhãn, và đó là câu trả lời ngắn nhất cho "pandas khác NumPy chỗ
   * nào". Phá HÌNH HỌC: **hàng xa hẹp hơn hàng gần** (bề rộng 84 → 62 đơn vị,
   * tỉ lệ hội tụ **0,74**), hai hàng nghiêng khác nhau, ba ray không song
   * song. Mắt đọc ra ngay "cùng một lưới, nhìn chếch".
   *
   * Góc nét đo được: 15° 15° 12° 15° 48° 57° 72°. Gần trục nhất **12°**.
   */
  stars: [
    { code: 'N01', x: 0, y: 42.2, role: 'ô 1-1 — hàng GẦN' },
    { code: 'N02', x: 42, y: 53.3, role: 'ô 1-2 — hàng GẦN' },
    { code: 'N03', x: 84, y: 64.5, role: 'ô 1-3 — hàng GẦN' },
    { code: 'N04', x: 38, y: 0, role: 'ô 2-1 — hàng XA' },
    { code: 'N05', x: 72, y: 7.4, role: 'ô 2-2 — hàng XA' },
    { code: 'N06', x: 100, y: 14.9, role: 'ô 2-3 — hàng XA' },
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
  /** NẤC THỨ HAI của cung phụ thuộc — xem chú thích ở `SKY_M5.box`. */
  box: [1170, 200, 173, 167],
  grid: [100, 100],
  /**
   * VẼ LẠI thành BÀN NHÌN TRỤC ĐO (§6.3) — hình cũ có **12/12 nét** trong 8°
   * của một trục (sáu nét ở 3°, sáu nét ở 80°). Đó là chòm bệnh nặng nhất cả
   * bản đồ.
   *
   * Giữ NGHĨA: hàng nhãn trên, cột nhãn trái (hai thứ này vẽ bằng nét ĐẬM —
   * chỗ duy nhất độ dày nét mang nghĩa), bốn ô thân. Phá HÌNH HỌC: hàng nhãn
   * chạy lên-phải ~15°, cột nhãn chạy xuống-phải ~70°, nên mọi ô thành hình
   * BÌNH HÀNH thay vì hình chữ nhật.
   *
   * Hội tụ NHẸ: bước cột 34 → 32 (0,94), bước hàng 28 → 30. Đủ để không ra
   * lưới máy, chưa đủ để làm biến dạng cái bảng — một cái bảng méo nhiều thì
   * thôi đọc ra là bảng, mà "có nhãn" là toàn bộ nghĩa của chòm này.
   *
   * Góc nét đo được: 15° 13° 69° 67° 19° 17° 24° 22° 72° 69° 75° 72°. Gần
   * trục nhất **13°**.
   */
  stars: [
    { code: 'PD01', x: 6, y: 34, role: 'ô góc — index gặp columns' },
    { code: 'PD02', x: 40, y: 24, role: 'hàng nhãn trên' },
    { code: 'PD03', x: 72, y: 16, role: 'hàng nhãn trên' },
    { code: 'PD04', x: 16, y: 62, role: 'cột nhãn trái' },
    { code: 'PD05', x: 48, y: 50, role: 'thân' },
    { code: 'PD06', x: 78, y: 40, role: 'thân' },
    { code: 'PD07', x: 28, y: 92, role: 'cột nhãn trái' },
    { code: 'PD08', x: 58, y: 78, role: 'thân' },
    { code: 'PD09', x: 86, y: 66, role: 'thân' },
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
  /** NẤC THỨ BA của cung phụ thuộc — xem chú thích ở `SKY_M5.box`. */
  box: [1180, 45, 137, 91],
  grid: [100, 100],
  /** XOAY −17°: góc nét trước là 90 0 36 26 30 — hai cái TRỤC nằm ở đúng 0° và
   *  90°, tức hình đọc ra là một hệ trục do máy vẽ. Sau khi xoay:
   *  107 17 53 43 47, không nét nào dưới 10°.
   *
   *  Hai trục vẫn VUÔNG GÓC VỚI NHAU (xoay bảo toàn góc giữa hai nét), nên
   *  nghĩa "hai trục và một đường đi lên từ gốc" còn nguyên — chỉ có cái trục
   *  thôi trùng với mép khung. */
  rotate: -17,
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
  /**
   * GÓC PHẢI–TRÊN, và chòm NHỎ NHẤT bản đồ — 72 px đường kính bao (§5.3).
   *
   * Tỉ lệ M1 : M8 = 5,1 : 1 là con số mà lời chê "mọi chòm một cỡ" hỏi tới:
   * bản cũ đo được **3,53 : 1**, và **1,86 : 1** nếu bỏ M8 ra — tức sáu trên
   * tám chòm nằm trong khoảng 1,86 : 1. Mắt đọc "rải gần đều" chủ yếu từ việc
   * MỌI THỨ BẰNG NHAU, không từ toạ độ.
   *
   * Nó chỉ an toàn vì **cú phóng (`c1c1e0e`) đã có**: bấm một chặng là phóng
   * vào nó, và tỉ lệ gần giữ lại tên bài thật. Bản đồ nền không còn phải đọc
   * được ở mức BÀI. Nếu cú phóng bị gỡ, tỉ lệ này phải lùi về ~4 : 1.
   */
  box: [965, 45, 60, 40],
  grid: [100, 100],
  stars: [
    { code: 'DA01', x: 26, y: 50, role: 'ngôi thứ nhất' },
    { code: 'DA02', x: 74, y: 50, role: 'ngôi thứ hai' },
  ],
  /** XOAY +34°: cặp sao đôi nằm ngang ĐÚNG 0° là một nét căn trục, và một nét
   *  thì cũng là 1/1 vi phạm. 34° đưa nó thoát sàn 10°. */
  rotate: 34,
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
  'tinh-van',
  'khe-bui',
  'soi-sang',
  /**
   * NGUỒN SÁNG LÊN TRÊN TINH VÂN, đổi 20/10/2026 — và đây là một thay đổi
   * người dùng thấy ngay, không một chi tiết thứ tự.
   *
   * Khi mặt trời còn ở góc trên-trái (124, 104) nó nằm NGOÀI dải Ngân Hà, nên
   * vẽ nó dưới tinh vân chẳng khác gì. Từ lúc nó về giữa khung (680, 313) thì
   * dải chạy ngay SAU nó (`SKY_MILKYWAY.nearSun`), và mười bốn bậc tinh vân ở
   * độ mờ 0,15 cộng dồn thành 0,90 — tức **cái lõi trắng bị phủ gần kín**. Đo
   * trên tranh thật: tâm mặt trời ra `rgb(120, 127, 146)`, L = 0,21, trong khi
   * hồ sơ đòi trắng tinh L = 1,0.
   *
   * Và nó cũng làm `do_sang_rgb` nói dối, vì phép đo ấy cộng nguồn sáng SAU
   * CÙNG với một lý lẽ đã hết đúng: *"ở chỗ nó sáng nhất thì tinh vân đã
   * loãng, nó nằm ngoài dải Ngân Hà"*. Thứ tự mới làm phép đo và bức tranh
   * nói lại cùng một thứ — và nó đúng cả về nghĩa: §8.2 muốn **mặt trời đứng
   * TRƯỚC một khối sáng**, không đứng sau nó.
   */
  'nguon-sang',
  'loe-ngang',
  /** Năm nêm tia sáng xuyên bụi (`SKY_LIGHT.ray`) — TRÊN tinh vân vì chúng
   *  là thứ CHẮN ánh sáng, và DƯỚI khối chân trời vì mọi nêm bị nó cắt. */
  'tia-bui',
  'quang-chan-troi',
  'truong-sao',
  'luoi',
  'mach-hoang-dao',
  /** Ba hành tinh = ba bài cửa (`SKY_PLANET`). DƯỚI `net-chom` và dưới ba lớp
   *  sao: hành tinh là một VẬT mang bài, còn ngôi vẫn là dấu của bài — nên
   *  ngôi phải nằm TRÊN cái đĩa, không bị nó ăn mất. */
  'hanh-tinh',
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
  /**
   * CÂU NÀY PHẢI NÓI RA CÁI ĐỘNG TỪ, không chỉ nói là "có hover".
   *
   * Nghiên cứu §2.8 đo được rằng cả bảy bản đồ đối chiếu đều cho người chơi
   * **một động từ có hậu quả**, còn bản đồ này chỉ có "trỏ". Nay nó có ba
   * việc làm được bằng tay, nên câu dẫn phải dạy cả ba — một thao tác không ai
   * biết để thử thì không tồn tại: rê con trỏ (ngôi gần nhất tự nhận mình),
   * Tab (vào từng chặng), mũi tên (đi giữa các ngôi trong chặng).
   */
  hint: 'Bấm (hoặc chạm) một chòm để PHÓNG VÀO chặng ấy: ở tỉ lệ gần mỗi ngôi mang tên bài thật và thứ tự học. Esc hoặc nút Thoát để lùi ra, và nút Lùi của trình duyệt cũng đúng. Rê con trỏ trên bầu trời: ngôi gần nhất tự nhận mình và nói ra mã bài; trỏ vào một chòm thì cả chặng rõ lên, kèm tên khoá và số bài. Đi bằng bàn phím: Tab qua từng chặng, Enter để phóng vào, mũi tên đi giữa các ngôi trong chặng.',
  /** ── CÂU CHỮ CỦA TỈ LỆ GẦN ──────────────────────────────────────────
   *
   *  `{…}` do `page.tsx` thay. Ở đây chứ không trong TSX vì `node --test` đọc
   *  được — cùng lý do cả khối này tồn tại. */
  zoomExit: 'Thoát khỏi chặng',
  /** `aria-label` của lớp nền trống. Nó là đường ra thứ ba (Esc · nút Thoát ·
   *  bấm ra ngoài), và đường ra phải CHẮC HƠN đường vào. */
  zoomBackdrop: 'Bấm vào khoảng trời trống để lùi ra khỏi chặng',
  zoomPanelTitle: 'Chặng {key} · {sub} — {n} bài, theo thứ tự học',
  /** Nói ra rằng tỉ lệ gần ĐANG giữ gì: ba thứ không có ở tỉ lệ xa. Không nói
   *  thì người ta tưởng vừa phóng to một bức ảnh. */
  /** `{key}` do `page.tsx` thay. Câu thứ ba là ĐƯỜNG DÙNG ĐƯỢC TRÊN ĐIỆN
   *  THOẠI của liên kết hai chiều: ở đó không có hover, nên nếu cái nối giữa
   *  một dòng và một ngôi chỉ sống trong `:hover` thì nửa số người dùng không
   *  bao giờ biết dòng nào ứng với ngôi nào. Con số thứ tự thì có mặt ở CẢ
   *  HAI chỗ cùng lúc, không cần một cái tay nào. */
  zoomNote: 'Đang ở tỉ lệ gần của chặng {key}. Thứ tự dưới đây LÀ thứ tự học — bản đồ cố ý không vẽ mũi tên lộ trình, nên ở tỉ lệ xa thứ tự này không đọc được ở đâu cả. Con số đầu mỗi dòng cũng in trên ngôi tương ứng: trỏ (hoặc Tab) vào một dòng thì ngôi ấy phát sáng, và ngược lại.',
  /** `alt` của tấm ảnh ĐẦU. Chỉ một tấm mang mô tả: bốn tấm nền là MỘT bức,
   *  và bốn câu mô tả cho một bức là bốn lần đọc lại cùng một thứ cho người
   *  dùng trình đọc màn hình. */
  alt: 'Bản đồ sao: tám chòm, bốn mươi tám ngôi — mỗi ngôi là một bài. Một dải Ngân Hà chạy chéo qua cả bầu trời, và một cung nét đứt nối bốn chặng NumPy, pandas, Matplotlib và dự án.',
  legendTitle: 'Chú giải',
  /* KHÔNG CÒN `scaleNote`, và đó là một việc BỎ chứ không phải một việc quên.
     Chủ sản phẩm xem màn phóng gần ngày 19/10/2026 và nói đúng một câu: "bỏ
     phần ca đi". Con số ca chấm thôi in thành CHỮ — ở chip trên ngôi và ở
     bảng bài — nên câu "Thang bán kính: 6 ca … tới 14 ca …" trở thành một
     chú giải cho một con số không còn hiện ở đâu, tức đúng loại chữ mà trang
     này phải ít nhất có thể.
     Bán kính thì VẪN mang số ca chấm (`starMagnitude`): đó là HÌNH, không
     phải chữ, và `legend` dưới đây vẫn nói ra nó. `starScaleRange()` cũng
     giữ — nó là phép đo mà ca test dùng để canh thang bán kính của bức
     tranh, không phải một câu chữ. */
  /** Chú giải nói ra DẤU NÀO MANG NGHĨA và dấu nào là chất liệu (§12). Ba dòng
   *  đầu là ba lớp liên kết của §4 — chúng phải phân biệt được bằng mắt, nên
   *  chúng cũng phải phân biệt được bằng chữ. */
  legend: [
    'Nét LIỀN, sắc của chặng: gom các bài của một chặng thành MỘT hình. Nó không nói thứ tự phải học.',
    'Nét ĐỨT xanh lam đi qua bốn chòm trên-phải: phụ thuộc thật duy nhất của khoá — NumPy → pandas → Matplotlib → dự án. Không có mũi tên vì nó là một quan hệ, không phải một lộ trình.',
    'Dải bụi sáng chạy chéo cả bầu trời là Ngân Hà. Mọi chòm đều nằm trong nó hoặc ngoài nó — và đó đã là một quan hệ. Nó cũng là lý do trời dày sao ở giữa và thưa ở hai góc.',
    // DÒNG NÀY NÓI NGUỒN CỦA BÁN KÍNH, và KHÔNG hứa một con số nào nữa. Mệnh
    // đề cuối từng là "rê con trỏ tới một ngôi là thấy con số ấy" — từ lúc
    // chip thôi in số ca (19/10/2026) nó là một lời hứa không giữ được, và
    // một chú giải sai còn tệ hơn không có chú giải: người ta sẽ rê con trỏ
    // đi tìm. Thang vẫn đọc được bằng mắt (ngôi nào to hơn ngôi nào), chỉ
    // không đọc được bằng số — và đó là điều câu này nói thẳng ra.
    'Ngôi có SẮC và có quầng = một bài. Bán kính lấy từ SỐ CA CHẤM của bài đó, không ai chọn cho đẹp — nên nó nói bài nào nặng hơn bài nào, chứ không nói nặng bao nhiêu.',
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
  const p = rotateStar(c, s);
  const all = c.stars.map((q) => rotateStar(c, q));
  // KHỚP THEO BAO CỦA TẬP NGÔI, không theo bao của LƯỚI — và đó là một thay
  // đổi hành vi, nên nói ra: `grid` là hệ toạ độ mà toạ độ ngôi được viết
  // trong, còn thứ phải vừa hộp là cái HÌNH. Một hình chiếm x 4…88 của một
  // lưới rộng 100 thì khớp theo lưới sẽ bỏ trống 12 % hộp mãi mãi, và tám
  // khoảng trống như thế là lý do tám chòm cũ "mọi chòm một cỡ": đường kính
  // bao thật của chúng chỉ nằm trong khoảng 1,86 : 1.
  //
  // Sau khi XOAY thì càng phải thế: bao của một hình xoay 48° rộng hơn hẳn bao
  // của chính nó lúc chưa xoay, nên khớp theo lưới sẽ cho hình tràn ra NGOÀI
  // hộp — tức tràn vào khe 50 px với chòm bên cạnh.
  const x0 = Math.min(...all.map((q) => q.x));
  const x1 = Math.max(...all.map((q) => q.x));
  const y0 = Math.min(...all.map((q) => q.y));
  const y1 = Math.max(...all.map((q) => q.y));
  const ew = Math.max(1e-6, x1 - x0);
  const eh = Math.max(1e-6, y1 - y0);
  const k = Math.min(bw / ew, bh / eh);
  const ox = bx + (bw - ew * k) / 2;
  const oy = by + (bh - eh * k) / 2;
  return { x: ox + (p.x - x0) * k, y: oy + (p.y - y0) * k };
}

/** Toạ độ lưới sau khi XOAY quanh tâm lưới. Cùng công thức ở `dat_sao()` phía
 *  Python; ca test so lại từng ngôi, nên hai chỗ không lệch nhau được. */
function rotateStar(c: SkyConstellation, s: SkyStar): { x: number; y: number } {
  const deg = c.rotate ?? 0;
  if (!deg) return { x: s.x, y: s.y };
  const [gw, gh] = c.grid;
  const th = (deg * Math.PI) / 180;
  const co = Math.cos(th);
  const si = Math.sin(th);
  const dx = s.x - gw / 2;
  const dy = s.y - gh / 2;
  return { x: gw / 2 + dx * co - dy * si, y: gh / 2 + dx * si + dy * co };
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
 * SỐ BÀI trong danh sách phẳng 48 bài của ngôi thứ `j` ở chặng thứ `i`.
 *
 * Cộng dồn số bài của các chặng trước, KHÔNG viết cứng tám con số: thêm một
 * bài vào M2 là liên kết của M3…M8 tự dịch theo. Hàm này ở TS vì nay có HAI
 * chỗ cần nó (ô bấm cả chặng ở `page.tsx`, và 48 liên kết ngôi ở
 * `SkyCursor.tsx`) — và hai chỗ tự cộng dồn là hai chỗ sẽ lệch.
 */
export function lessonNumber(stage: number, star = 0): number {
  let n = 1;
  for (let i = 0; i < stage; i += 1) n += SKY_CONSTELLATIONS[i].stars.length;
  return n + star;
}

/**
 * HAI ĐẦU CỦA THANG BÁN KÍNH, tính từ `SKY_TESTS`.
 *
 * Trước đây nó cấp số cho một câu chú giải (`scaleNote`); câu ấy đã bỏ cùng
 * với chữ "ca" ngày 19/10/2026. Hàm thì GIỮ, và không phải vì tiếc code: nó
 * là phép đo mà ca test dùng để chứng minh thang bán kính của BỨC TRANH còn
 * mở (`SKY_BUDGET.scaleRatioMin`) và còn khớp giáo trình. Bán kính vẫn là chỗ
 * duy nhất số ca chấm còn sống, nên nó cần một phép đo canh — chỉ là phép đo
 * ấy nay nói với ca test, không nói với người đọc trang.
 */
export function starScaleRange(): {
  min: number; max: number; minCodes: string[]; maxCodes: string[]; ratio: number;
} {
  const codes = SKY_CONSTELLATIONS.flatMap((c) => c.stars.map((s) => s.code));
  const nums = codes.map((code) => SKY_TESTS[code] ?? 0);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return {
    min,
    max,
    minCodes: codes.filter((code) => SKY_TESTS[code] === min),
    maxCodes: codes.filter((code) => SKY_TESTS[code] === max),
    ratio: Math.round((starMagnitude(max).radius / starMagnitude(min).radius) * 100) / 100,
  };
}

/**
 * Tên nghe được của một ngôi, cho `aria-label` của 48 liên kết bài.
 *
 * Phải nói ĐỦ những gì bức tranh nói bằng mắt — chặng, số bài, mã bài, số ca
 * chấm — vì người dùng trình đọc màn hình không thấy chip nào hiện ra. Đây là
 * chỗ "giảm chuyển động nhưng GIỮ NGUYÊN tin" được thi hành ở mức sâu nhất:
 * tin không nằm trong hiệu ứng, nó nằm trong DOM.
 *
 * SỐ CA CHẤM Ở ĐÂY LÀ CHỦ Ý, không phải chỗ sót lại sau khi chip bỏ chữ "ca"
 * ngày 19/10/2026. Chip bỏ vì nó in LẠI bằng chữ một con số mà bức tranh đã
 * nói bằng BÁN KÍNH; câu này thì là bản CHỮ DUY NHẤT của chính cái bán kính
 * ấy — người dùng trình đọc màn hình không đo được ngôi nào to hơn ngôi nào.
 * Bỏ nốt nó là lấy đi của họ một tin mà người sáng vẫn còn.
 */
export function starAriaLabel(stageKey: string, code: string, lesson: number): string {
  const n = SKY_TESTS[code];
  return `Bài ${lesson} · ${code} — chặng ${stageKey}, ${n} ca chấm`;
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

/**
 * HÌNH HỌC CÚ PHÓNG của một chặng, hay `null` nếu khoá không phải một chặng.
 *
 * Trả `null` chứ không ném: khoá đến từ `?chang=` trong URL, tức từ người lạ.
 * Một tham số rác phải cho ra bản đồ ở TỈ LỆ XA, không cho ra một trang 500 —
 * và `?chang=<script>` thì không được đi tới chỗ nào ghép chuỗi cả.
 */
export function zoomFor(key: string | null | undefined): typeof SKY_ZOOM_PLACED[number] | null {
  if (!key) return null;
  return SKY_ZOOM_PLACED.find((z) => z.key === key) ?? null;
}

/**
 * ĐẢO phép biến hình: một điểm ở tỉ lệ `(u, v)` của KHUNG THẤY ĐƯỢC nằm ở toạ
 * độ khung nào.
 *
 * CSS làm `transform: scale(S) translate(dx%, dy%)` với `dx = 0,5 − cx`, nên
 * cửa sổ thấy được là `[cx − 0,5/S ; cx + 0,5/S]` và phép đảo là một phép nội
 * suy tuyến tính trên cửa sổ ấy.
 *
 * Vì sao hàm này ở TS và không ở `SkyCursor.tsx`: ca test gọi nó rồi so với
 * chính các khối `.phong*` trong CSS. Một phép đảo sống trong một `useEffect`
 * là một phép đảo không ai đo được — và lúc nó sai thì triệu chứng là "vòng dò
 * nhận ngôi bên cạnh", thứ dễ đọc thành "chuột hơi lệch".
 */
export function zoomToFrame(key: string | null | undefined, u: number, v: number):
{ x: number; y: number } {
  const z = zoomFor(key);
  if (!z) return { x: u * SKY_FRAME.width, y: v * SKY_FRAME.height };
  const nua = 0.5 / z.scale;
  return {
    x: (z.cx - nua + u * 2 * nua) * SKY_FRAME.width,
    y: (z.cy - nua + v * 2 * nua) * SKY_FRAME.height,
  };
}

/**
 * Một dòng của bảng bài ở tỉ lệ gần: thứ tự trong chặng, số bài phẳng, mã,
 * TÊN THẬT.
 *
 * Gộp bốn thứ vào một hàm vì cả bốn phải cùng một nguồn: `page.tsx` dựng bảng
 * dưới khung, và `SkyCursor.tsx` dựng chip trong khung. Hai chỗ tự tra
 * `SKY_TITLES` và tự cộng `lessonNumber` là hai chỗ sẽ lệch, và kiểu lệch tệ
 * nhất có thể — một cái tên nằm cạnh một số bài của bài khác. Nay còn một
 * việc thứ hai dựa vào chỗ chung ấy: `order` là CHÌA KHOÁ nối một dòng với
 * một ngôi (xem `zoomNote`), nên con số ở bảng và con số in trên ngôi phải
 * đến từ cùng một phép đếm.
 *
 * KHÔNG CÒN `tests`: bảng bài thôi in cột "9 ca" ngày 19/10/2026, nên một
 * trường không ai đọc là một trường sẽ cũ mà không ai thấy. Số ca chấm còn
 * sống ở `SKY_TESTS` (bán kính ngôi) và ở `starAriaLabel`.
 */
export function stageLessons(key: string): {
  order: number; lesson: number; code: string; title: string;
}[] {
  const i = SKY_CONSTELLATIONS.findIndex((c) => c.key === key);
  if (i < 0) return [];
  return SKY_CONSTELLATIONS[i].stars.map((s, j) => ({
    order: j + 1,
    lesson: lessonNumber(i, j),
    code: s.code,
    title: SKY_TITLES[s.code] ?? s.code,
  }));
}
