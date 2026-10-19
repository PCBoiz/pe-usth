/**
 * BẢN ĐỒ SAO — dữ liệu hình thái và BẢNG MÀU ("profile") của bầu trời.
 *
 * Đặc tả: `design/v3/ban-do-sao.md` (ĐỪNG sửa tệp đó từ đây — nó là nguồn, và
 * một agent khác đang viết phần bản SÁNG vào chính nó).
 *
 * Đây là bản dựng MỘT MẪU: chòm **M1 · Chạc** (7 bài của chặng Tiến trình và
 * subprocess), trường sao nền, tinh vân, một nhãn. Bảy chòm còn lại chưa dựng.
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
 * Ô CROP của bản mẫu. Bản mẫu không vẽ cả bầu trời — nó vẽ dải chân trời quanh
 * hộp M1, đúng cách `scene-M*.svg` của bản vực là một ô crop của cùng một bức.
 * Toạ độ sao vẫn là toạ độ THẬT trong khung 1360 × 820, nên khi dựng nốt bảy
 * chòm thì chỉ `SKY_VIEW` bị bỏ, không có con số nào phải tính lại.
 */
export const SKY_VIEW = { x: 40, y: 430, width: 660, height: 390 } as const;

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
  levelLo: 0.3,
  levelHi: 0.62,
  /** Lớp bụi xa: dải rộng gấp bấy nhiêu, hai ngưỡng, độ mờ mỗi bậc. */
  dust: { spread: 1.9, levels: [0.34, 0.46], opacity: 0.21 },
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
  starPad: 6,
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
 */
export const SKY_LABEL_PLACED = [
  { key: 'M1', anchor: 'P05', dir: [1, 1], leg: 34 },
] as const;

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
  /** Trần độ chói: không điểm nào của bức được sáng hơn màu này. */
  ceiling: string;
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
  base: '#070C17',
  dustFar: '#141C34',
  nebula: '#1E2B4E',
  nebulaCore: '#3C4166',
  dustLane: '#0A1020',
  filament: '#4A4A6E',
  horizon: '#2A2416',
  ceiling: '#4A4A6E',
  hullCeiling: '#232C4A',
  textCeiling: '#2F3B63',
  field: '#C6D2E8',
  core: '#FFFFFF',
  grid: '#5A6B93',
  text: '#E8EEF7',
  textSub: '#AFBDD2',
  code: '#C9A646',
  hues: {
    m1: '#F0B35A',
    m2: '#E3C877',
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
 * Lưới cục bộ của một chòm: 100 đơn vị ngang × 200 đơn vị dọc, y đi XUỐNG.
 *
 * Đặc tả §2 viết "toạ độ cho theo hệ 0–100 trong hộp của chính chòm đó", nhưng
 * bảng M1 của chính nó có y tới 195 — hai câu không khớp nhau. Giải theo hướng
 * GIỮ ĐƯỢC HÌNH: lưới là 100 × 200 và nó được đặt vào hộp bằng tỉ lệ ĐỒNG
 * DẠNG (`min`), căn giữa. Nếu bóp theo từng trục cho khít hộp 310 × 210 thì
 * cái chạc cao 186 đơn vị thành một hình bè ra — tức mất đúng thứ phải đọc ra.
 */
export const SKY_LOCAL = { width: 100, height: 200 } as const;

/** Một chòm. `box` là hộp của nó trong khung 1360 × 820 (§15). */
export type SkyConstellation = {
  key: string;
  hue: keyof SkyProfile['hues'];
  name: string;
  /** Dòng phụ của nhãn là `M1 · <subtitle> · <số ngôi> bài` — SỐ BÀI đếm từ
   *  `stars`, không viết cứng, nên nó không nói sai được. */
  subtitle: string;
  box: readonly [number, number, number, number];
  stars: readonly SkyStar[];
  lines: readonly (readonly [string, string])[];
};

/**
 * M1 · CHẠC — Tiến trình và subprocess, 7 bài (§2).
 *
 * Hình: một thân mọc lên, RẼ ĐÔI, hai nhánh CHỤM LẠI ở đỉnh. `fork()` tách
 * một tiến trình thành hai, `wait()` chụm chúng lại — đó là hình vẽ mà mọi
 * sách hệ điều hành đều vẽ cho vòng đời tiến trình, không phải một ẩn dụ xa
 * xôi. Phần kín giữa hai nhánh là khoảng thời gian cả hai cùng sống.
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
  name: 'Chạc',
  subtitle: 'Tiến trình',
  box: [90, 585, 310, 210],
  stars: [
    { code: 'P01', x: 50, y: 195, role: 'gốc thân' },
    { code: 'P02', x: 50, y: 140, role: 'chỗ rẽ' },
    { code: 'P03', x: 22, y: 100, role: 'nhánh trái' },
    { code: 'P04', x: 12, y: 48, role: 'nhánh trái' },
    { code: 'P05', x: 78, y: 100, role: 'nhánh phải' },
    { code: 'P06', x: 88, y: 48, role: 'nhánh phải' },
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
 * Khoá các chòm của bản mẫu. Bảy chòm còn lại (§2) chưa dựng.
 *
 * Mảng này là thứ `build_sky.py` đọc, rồi với mỗi khoá nó tra hằng `SKY_<khoá>`
 * — nên thêm một chòm là thêm một hằng VÀ một khoá ở đây, không phải sửa
 * Python. `SKY_CONSTELLATIONS` dưới đây phải khớp mảng này; ca test so lại, vì
 * TypeScript không dựng được danh sách kia từ danh sách này.
 */
export const SKY_CONSTELLATION_KEYS = ['M1'] as const;

/** Danh sách chòm của bản mẫu, cho phía React/test dùng. */
export const SKY_CONSTELLATIONS: readonly SkyConstellation[] = [SKY_M1];

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
  'quang-chan-troi',
  'truong-sao',
  'luoi',
  'net-chom',
  'quang-sao',
  'sao-bai',
  'loi-sao',
  'nhan',
] as const;

/** Câu chữ của route xem thử. Ở đây, không trong TSX: `node --test` đọc được. */
export const STAR_COPY = {
  title: 'Bản đồ sao — mẫu chòm M1',
  lead: 'Bảy ngôi là bảy bài của chặng Tiến trình và subprocess. Ngôi càng sáng, bài càng đòi nhiều ca chấm phải qua.',
  hint: 'Trỏ hoặc Tab vào chòm để nó rõ lên.',
  regionLabel: 'Chặng M1 · Tiến trình và subprocess — 7 bài',
  legendTitle: 'Chú giải',
  legend: [
    'Ngôi có SẮC và có quầng = một bài. Bán kính lấy từ số ca chấm của bài đó.',
    'Chấm trắng xám nhỏ, không quầng = sao nền. Nó không mang tin.',
    'Lưới toạ độ mờ = chất liệu, không mang nghĩa. Nó đứt ở chỗ một ngôi đi qua.',
    'Nét nối chỉ gom bảy ngôi thành MỘT hình; nó không nói thứ tự phải học.',
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

/** Toạ độ lưới cục bộ → khung 1360 × 820, tỉ lệ ĐỒNG DẠNG, căn giữa hộp. */
export function placeStar(c: SkyConstellation, s: SkyStar): { x: number; y: number } {
  const [bx, by, bw, bh] = c.box;
  const k = Math.min(bw / SKY_LOCAL.width, bh / SKY_LOCAL.height);
  const ox = bx + (bw - SKY_LOCAL.width * k) / 2;
  const oy = by + (bh - SKY_LOCAL.height * k) / 2;
  return { x: ox + s.x * k, y: oy + s.y * k };
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
