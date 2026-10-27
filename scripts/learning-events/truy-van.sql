-- ============================================================================
-- BA CÂU HỎI, BA CÂU SQL — và một câu DELETE để đóng đợt thử nghiệm
-- ============================================================================
--
-- Chạy:  psql "$DIRECT_URL" -f scripts/learning-events/truy-van.sql
-- (dùng DIRECT_URL, không DATABASE_URL: pooler của Neon không cần cho việc này)
--
-- Bảng nguồn: `learning_events` — xem
-- prisma/migrations/20261028000000_learning_events/migration.sql để biết vì sao
-- từng cột có mặt. Ba câu dưới đây là lý do ba index trong migration đó tồn tại;
-- thêm câu mới mà chậm thì ĐO trước (`EXPLAIN ANALYZE`), đừng thêm index theo
-- cảm giác.
--
-- ============================================================================
-- ĐỌC KẾT QUẢ Ở n = 20–40 — ĐỌC MỤC NÀY TRƯỚC KHI ĐỌC MỘT CON SỐ NÀO
-- ============================================================================
--
-- 1. ĐỌC THEO THỨ BẬC, KHÔNG THEO TỈ LỆ. Với 20–40 người thử, "bài PD13 có 6
--    người đâm tường, bài PD14 có 1" là một phát hiện dùng được. "18% người học
--    đâm tường ở PD13" thì KHÔNG: ở n = 30 thì một người đổi nhóm làm con số
--    nhảy hơn 3 điểm phần trăm, nên mọi tỉ lệ ở đây có khoảng tin cậy rộng hơn
--    chính nó. Vì vậy mọi câu dưới đây đều `ORDER BY` một SỐ ĐẾM và không câu
--    nào tính phần trăm. Nếu ai thêm một cột `%`, hãy xoá nó.
--
-- 2. MỘT LẦN XẢY RA LÀ MỘT PHÁT HIỆN THẬT. Tín hiệu đáng tin nhất ở cỡ này là
--    nhị phân: "có người đâm tường ở đây". Một tester bỏ dở đúng một bài tập là
--    đủ để đi đọc lại đề bài đó.
--
-- 3. NHƯNG "KHÔNG LẦN NÀO XẢY RA" LÀ BẰNG CHỨNG YẾU VỀ SỰ VẮNG MẶT. Một bài
--    không có hàng nào trong câu (a) KHÔNG có nghĩa là bài đó ổn. Nó có thể
--    nghĩa là: chưa ai học tới đó (xem câu (c) để biết), hoặc sự kiện đã mất
--    (mất sự kiện ở đây là CÓ CẤU TRÚC — `pagehide` không fire khi đóng tab
--    trên iOS, Chrome ghi "(no events fired)" cho hidden→terminated, và KHÔNG
--    nguồn nào lượng hoá được tỉ lệ mất). Số học đi kèm: để có 85% cơ hội thấy
--    một vấn đề ít nhất một lần cần 5 người nếu nó ảnh hưởng 31% người dùng, 9
--    người nếu 20%, 18 người nếu 10%, và 189 người nếu 1%.
--
-- 4. GỘP XUYÊN BÀI Ở MỌI CHỖ GỘP ĐƯỢC. 5 tester mỗi người xong 20 bài cho 100
--    lượt-mở-bài, nhưng MỖI BÀI riêng lẻ vẫn chỉ được 5 người xem — nên kết
--    luận cho từng bài thừa hưởng mọi điểm yếu của quy tắc 5 người, còn kết
--    luận XUYÊN BÀI ("mẫu hướng dẫn bài tập không rõ") thì vững hơn nhiều.
--
-- 5. THỜI GIAN: chỉ dùng làm bộ phát hiện ngoại lai TRONG MỘT NGƯỜI ("người này
--    mất 40 phút cho bài 12 phút"), tuyệt đối không so trung bình cohort — dữ
--    liệu thời gian lệch dương nên phá giả định của nhiều phép kiểm. Và PHẢI
--    tách theo `payload->>'env'`: 27/172 bài chạy trên MÁY người học nên
--    `machineMs` ở đó không đo gì cả, còn 26 bài biểu đồ trả thêm ~0,8 s chỉ để
--    xuất PNG. Gộp chung là lấy trung bình của hai thứ khác loại.
--
-- 6. KHÔNG câu nào ở đây theo dõi MỘT CÁ NHÂN xuyên bài, và không câu nào trả
--    `user_id` ra ngoài. `user_id` chỉ xuất hiện bên trong phép gộp: câu (b)
--    phải đếm lần thử TRONG một người rồi mới lấy trung vị, câu (c) phải đếm số
--    người RIÊNG BIỆT. Cần một truy vấn theo dõi một người xuyên bài thì phải
--    nói ra và quyết riêng — đừng coi là đã được phép sẵn.
--
-- 7. MỘT LẦN THỬ là `kind IN ('Run.Test','Submit')`, không phải một phép so
--    bằng: ProgSnap2 tách hai loại đó, và chỉ lượt `Submit` mới ghi tiến độ.
--    `X-Run.Interrupted` (bấm Dừng / quá hạn) KHÔNG tính là một lần thử — một
--    lượt bị cắt không cho người học chẩn đoán nào, và đếm nó vào thì một vòng
--    lặp vô hạn làm phồng con số của một bài mà họ giải xong ở lượt thứ hai.
--
-- 8. MỐC THỜI GIAN để so GIỮA người học là mốc SUY RA, không phải `client_at`:
--       derived_at = created_at - (client_sent_at - client_at)
--    Hai mốc client đọc từ cùng một đồng hồ nên HIỆU của chúng đúng dù giờ máy
--    họ lệch hẳn. `client_at` một mình sai theo độ lệch đồng hồ; `created_at`
--    một mình thì cả lô cùng một giá trị nên không xếp được thứ tự trong lô.
--    Câu (c) dùng nó; hai câu kia chỉ đếm nên không cần.


-- ############################################################################
-- (a) BÀI NÀO CÓ NGƯỜI ĐÂM TƯỜNG
-- ############################################################################
-- Tín hiệu nhị phân, gộp theo bài. Bốn dấu hiệu, mỗi dấu hiệu một cột, CỐ Ý
-- KHÔNG gộp thành một điểm tổng: một điểm tổng thì "3 người bỏ dở" và "3 người
-- trượt y hệt" ra cùng một con số, mà hai chuyện đó cần hai cách sửa khác nhau
-- (đề bài không rõ, so với bài quá khó).
--
-- Đọc: nhìn `nguoi_dam_tuong` giảm dần, lấy 10–15 bài đầu, rồi MỞ ĐÚNG NHỮNG
-- BÀI ĐÓ ra đọc. Đừng đọc cả bảng.
WITH dau_hieu AS (
  SELECT
    e.course_id,
    e.lesson_no,
    e.user_id,
    -- Bỏ dở: rời bài khi chưa hoàn thành. `screen_key` nói rời ở MÀN nào.
    count(*) FILTER (WHERE e.kind = 'X-Lesson.Abandon')                       AS bo_do,
    -- Trượt Y HỆT lượt trước: cùng mã, cùng tập ca trượt, cùng loại lỗi.
    count(*) FILTER (WHERE e.kind = 'X-Repeat.Fail')                          AS truot_lap,
    -- Bấm Dừng / bị cắt vì quá hạn. Bản "undo/erase" của sản phẩm này.
    count(*) FILTER (WHERE e.kind = 'X-Run.Interrupted')                      AS cat_ngang,
    -- Mở gợi ý hoặc chèn lời giải mẫu: dấu hiệu bỏ-cuộc mạnh nhất còn trong bài.
    count(*) FILTER (WHERE e.kind = 'Resource.View')                          AS xem_loi_giai,
    -- Lỗi HẠ TẦNG, tách riêng — KHÔNG được cộng vào các cột trên. Nếu cột này
    -- lớn thì bài đó không khó, nền tảng của mình đang hỏng.
    count(*) FILTER (WHERE e.kind = 'X-Runtime.Failure')                      AS loi_ha_tang
  FROM learning_events e
  WHERE e.kind IN (
          'X-Lesson.Abandon', 'X-Repeat.Fail', 'X-Run.Interrupted',
          'Resource.View', 'X-Runtime.Failure')
    AND e.lesson_no IS NOT NULL
  GROUP BY e.course_id, e.lesson_no, e.user_id
)
SELECT
  d.course_id,
  d.lesson_no,
  l.lesson_code,
  l.title,
  -- SỐ NGƯỜI, không phải số sự kiện: một người bấm Dừng 30 lần ở một bài là
  -- MỘT phát hiện, không phải 30. Đếm sự kiện làm một người sốt ruột trông như
  -- cả cohort đang tắc.
  count(*) FILTER (WHERE d.bo_do + d.truot_lap + d.cat_ngang > 0)        AS nguoi_dam_tuong,
  count(*) FILTER (WHERE d.bo_do        > 0)                            AS nguoi_bo_do,
  count(*) FILTER (WHERE d.truot_lap    > 0)                            AS nguoi_truot_lap,
  count(*) FILTER (WHERE d.cat_ngang    > 0)                            AS nguoi_cat_ngang,
  count(*) FILTER (WHERE d.xem_loi_giai > 0)                            AS nguoi_xem_loi_giai,
  count(*) FILTER (WHERE d.loi_ha_tang  > 0)                            AS nguoi_gap_loi_ha_tang
FROM dau_hieu d
-- LEFT JOIN, không INNER: một sự kiện mang mã bài không còn tồn tại (đổi giáo
-- trình giữa đợt) vẫn phải hiện ra — nó chính là dấu hiệu có gì đó lệch. Bảng
-- `learning_events` KHÔNG có khoá ngoại tới `lessons` đúng vì lý do đó.
LEFT JOIN lessons l
  ON l.course_id = d.course_id AND l.sort_order = d.lesson_no
GROUP BY d.course_id, d.lesson_no, l.lesson_code, l.title
HAVING count(*) FILTER (WHERE d.bo_do + d.truot_lap + d.cat_ngang > 0) > 0
ORDER BY nguoi_dam_tuong DESC, nguoi_truot_lap DESC, d.lesson_no;


-- ############################################################################
-- (b) SỐ LẦN THỬ TỚI KHI ĐẠT, THEO BÀI
-- ############################################################################
-- TRUNG VỊ và MAX, KHÔNG phải trung bình: ở n = 20–40 một người thử 40 lần kéo
-- trung bình của cả bài, mà chính người đó là phát hiện đáng xem nhất — nên
-- phải thấy họ ở cột `max_lan_thu`, đừng trộn họ vào một con số.
--
-- Chỉ đếm người ĐÃ ĐẠT. Người chưa đạt nằm ở cột riêng: gộp họ vào thì "số lần
-- thử tới khi đạt" của một bài mà 5 người bỏ ngang trông ĐẸP HƠN một bài ai
-- cũng làm được sau 3 lượt — đúng chiều ngược.
WITH lan_thu AS (
  SELECT
    e.course_id, e.lesson_no, e.user_id,
    -- `attemptNo` do client đếm trong CÙNG một tab; dùng số hàng của DB thì
    -- an toàn hơn (một lô gửi lại vẫn chỉ ra một hàng nhờ UNIQUE(event_id)).
    row_number() OVER (
      PARTITION BY e.course_id, e.lesson_no, e.user_id
      ORDER BY e.id
    ) AS thu_tu,
    (e.payload->>'passed')::boolean AS passed
  FROM learning_events e
  WHERE e.kind IN ('Run.Test', 'Submit')   -- xem ghi chú 7 ở đầu file
    AND e.lesson_no IS NOT NULL
), dat_o_lan AS (
  SELECT course_id, lesson_no, user_id, min(thu_tu) AS lan_dat
  FROM lan_thu
  WHERE passed IS TRUE
  GROUP BY course_id, lesson_no, user_id
), tat_ca AS (
  SELECT course_id, lesson_no, user_id, max(thu_tu) AS tong_lan
  FROM lan_thu
  GROUP BY course_id, lesson_no, user_id
)
SELECT
  t.course_id,
  t.lesson_no,
  l.lesson_code,
  l.title,
  count(*)                                                      AS nguoi_co_thu,
  count(d.user_id)                                              AS nguoi_da_dat,
  count(*) - count(d.user_id)                                   AS nguoi_chua_dat,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY d.lan_dat)        AS trung_vi_lan_dat,
  max(d.lan_dat)                                                AS max_lan_dat,
  -- Người chưa đạt: họ đã thử bao nhiêu lần rồi bỏ. Con số này mới là thứ nói
  -- "bài này ăn hết kiên nhẫn của họ".
  max(CASE WHEN d.user_id IS NULL THEN t.tong_lan END)          AS max_lan_cua_nguoi_chua_dat
FROM tat_ca t
LEFT JOIN dat_o_lan d
  ON  d.course_id = t.course_id
  AND d.lesson_no = t.lesson_no
  AND d.user_id   = t.user_id
LEFT JOIN lessons l
  ON l.course_id = t.course_id AND l.sort_order = t.lesson_no
GROUP BY t.course_id, t.lesson_no, l.lesson_code, l.title
ORDER BY max_lan_dat DESC NULLS LAST, nguoi_chua_dat DESC, t.lesson_no;


-- ############################################################################
-- (c) DROP-OFF THEO THỨ BẬC BÀI
-- ############################################################################
-- `ORDER BY lesson_no` — thứ tự giáo trình, vì câu hỏi là "người học rụng ở
-- ĐÂU", không phải "bài nào ít người nhất". Và đọc theo THỨ BẬC: cột
-- `rung_so_voi_bai_truoc` là một SỐ ĐẾM, cố ý không phải phần trăm (ghi chú 1).
--
-- `X-Lesson.Open` là mẫu số. Nó KHÔNG đo "đã học xong" — đó là việc của
-- `lesson_progress.completed_at`, và hai nguồn cho một sự thật là chỗ chúng
-- lệch nhau. Ở đây cố ý chỉ đọc "đã MỞ".
WITH mo_bai AS (
  SELECT
    e.course_id,
    e.lesson_no,
    e.user_id,
    -- Mốc SUY RA (ghi chú 8). `client_sent_at`/`client_at` có thể null (client
    -- cũ, hoặc đồng hồ lệch quá xa) nên `COALESCE` về `created_at`: thà mất độ
    -- chính xác của một hàng hơn là mất cả hàng đó.
    min(
      e.created_at
      - COALESCE(e.client_sent_at - e.client_at, interval '0')
    ) AS lan_dau_mo
  FROM learning_events e
  WHERE e.kind = 'X-Lesson.Open'
    AND e.lesson_no IS NOT NULL
  GROUP BY e.course_id, e.lesson_no, e.user_id
), theo_bai AS (
  SELECT
    course_id, lesson_no,
    count(DISTINCT user_id) AS nguoi_mo,
    min(lan_dau_mo)         AS lan_dau_tien,
    max(lan_dau_mo)         AS lan_cuoi
  FROM mo_bai
  GROUP BY course_id, lesson_no
)
SELECT
  t.course_id,
  t.lesson_no,
  l.lesson_code,
  l.title,
  t.nguoi_mo,
  -- Chênh so với bài LIỀN TRƯỚC trong cùng khoá. Một bước tụt mạnh ở đây là
  -- chỗ cần đọc; tụt một người thì không.
  lag(t.nguoi_mo) OVER (PARTITION BY t.course_id ORDER BY t.lesson_no)
    - t.nguoi_mo                                              AS rung_so_voi_bai_truoc,
  -- Mốc tuyệt đối: bài nào chưa ai tới. Một bài có `nguoi_mo = 0` KHÔNG xuất
  -- hiện trong bảng này (không có hàng nào) — và đó là thông tin, không phải
  -- lỗi: xem ghi chú 3.
  t.lan_dau_tien,
  t.lan_cuoi
FROM theo_bai t
LEFT JOIN lessons l
  ON l.course_id = t.course_id AND l.sort_order = t.lesson_no
ORDER BY t.course_id, t.lesson_no;


-- ############################################################################
-- (phụ) TÍN HIỆU SỬA/CHẠY — tắc ở NGỮ NGHĨA hay ở CÚ PHÁP
-- ############################################################################
-- KHÔNG phải một trong ba câu chính, nhưng nó miễn phí vì `editsSinceLastRun`
-- đã nằm trong payload, và nó phân biệt được hai kiểu tắc cần hai cách sửa:
--   nhiều SỬA + ít CHẠY   = tắc ở NGỮ NGHĨA (không biết phải viết gì)
--   nhiều SỬA + nhiều CHẠY = tắc ở CÚ PHÁP  (sửa mò cho hết lỗi)
-- CỐ Ý không tính Error Quotient hay RED: bài duy nhất áp chúng vào một khoá
-- Python với cohort 12 người thấy RED cho điểm khác 0 ở chỉ ~12% dự án, và cả
-- bộ độ đo đó gộp lại giải thích nhiều nhất 26% phương sai điểm thi — trong khi
-- điểm bài tập một mình đạt R² = 0,330. Tức chúng kém hơn thứ dự án đã có.
SELECT
  e.course_id,
  e.lesson_no,
  -- TÁCH THEO `env` (ghi chú 5): gộp 27 bài chạy trên máy người học với 131 bài
  -- chạy trong trình duyệt là lấy trung bình của hai thứ khác loại.
  e.payload->>'env'                                               AS env,
  count(*)                                                        AS so_luot_chay,
  sum((e.payload->>'editsSinceLastRun')::int)                     AS tong_lan_sua,
  round(
    sum((e.payload->>'editsSinceLastRun')::int)::numeric / count(*), 1
  )                                                               AS sua_moi_lan_chay,
  -- Thời gian MÁY, tách khỏi thời gian NGƯỜI. Trung vị, không trung bình.
  percentile_cont(0.5) WITHIN GROUP (ORDER BY (e.payload->>'machineMs')::int)
                                                                  AS trung_vi_machine_ms
FROM learning_events e
WHERE e.kind IN ('Run.Test', 'Submit')
  AND e.lesson_no IS NOT NULL
  AND e.payload ? 'editsSinceLastRun'
GROUP BY e.course_id, e.lesson_no, e.payload->>'env'
HAVING count(*) >= 3     -- dưới 3 lượt thì tỉ số là nhiễu, không phải tín hiệu
ORDER BY sua_moi_lan_chay DESC, e.lesson_no;


-- ############################################################################
-- ĐÓNG ĐỢT THỬ NGHIỆM — XOÁ DỮ LIỆU QUÁ HẠN
-- ############################################################################
-- HẠN LƯU: 90 NGÀY (hằng `HAN_LUU_NGAY` trong
-- src/learning-events/learning-event-kinds.ts; chú thích schema và câu này cùng
-- dẫn về con số đó, nên ba chỗ không nói ba hạn khác nhau).
--
-- Vì sao 90: một đợt thử nghiệm kéo dài vài tuần, cộng thời gian phân tích. Sau
-- đó mọi câu hỏi mà bảng này trả lời được đã được hỏi xong, và phần còn lại chỉ
-- là rủi ro không có người dùng.
--
-- KHÔNG có job tự xoá, có chủ đích: một job chưa ai kiểm là thứ sẽ hoặc không
-- chạy (rồi tưởng đã chạy) hoặc chạy quá tay. Đây là một lệnh người chạy.
--
-- Đếm trước, xoá sau. Chạy câu SELECT, đọc con số, rồi mới bỏ dấu chú thích ở
-- câu DELETE.
SELECT count(*) AS se_xoa, min(created_at) AS cu_nhat, max(created_at) AS moi_nhat
FROM learning_events
WHERE created_at < now() - interval '90 days';

-- DELETE FROM learning_events
-- WHERE created_at < now() - interval '90 days';
--
-- Xoá TOÀN BỘ khi đợt thử nghiệm kết thúc (không chờ 90 ngày):
-- DELETE FROM learning_events;
--
-- `DELETE` khối lớn để lại dead tuple, nên chạy `VACUUM (ANALYZE)
-- learning_events;` sau đó. Nếu có ngày bảng này lớn tới mức việc đó thành vấn
-- đề thì đường đúng là PHÂN VÙNG theo tháng rồi `DROP TABLE` một phân vùng —
-- xem chú thích trong migration. Hôm nay bảng còn xa mức đó.
--
-- Nửa thứ hai của đường xoá đã có sẵn và không cần nhớ: khoá ngoại tới `users`
-- là `ON DELETE CASCADE`, nên dọn một tài khoản khách là log của họ đi theo.
