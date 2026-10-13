/**
 * feedback-form.gs — tạo Google Form khảo sát cho buổi thử nghiệm khoá
 * "Advanced Python" (48 bài, chạy trong trình duyệt bằng Pyodide).
 *
 * VÌ SAO CÓ FILE NÀY: buổi thử với giảng viên/cố vấn USTH và sinh viên ngày
 * 14/10/2026 cần một bộ câu hỏi cố định, giống nhau cho mọi người, để sau còn
 * so sánh được giữa hai nhóm. Dựng form bằng script thay vì bấm tay để bộ câu
 * hỏi nằm trong repo, ai cũng dựng lại được y nguyên.
 *
 * CÁCH DÙNG (từng bước):
 *   1. Mở https://script.google.com rồi bấm "New project" (Dự án mới).
 *   2. Xoá hết code mẫu trong file Code.gs, dán TOÀN BỘ nội dung file này vào.
 *   3. Bấm Save (biểu tượng đĩa mềm). Đặt tên dự án gì cũng được.
 *   4. Ở ô chọn hàm phía trên, chọn "taoForm", rồi bấm Run (▶).
 *   5. Google hỏi quyền: bấm "Review permissions" → chọn tài khoản → "Advanced"
 *      → "Go to <tên dự án> (unsafe)" → "Allow". Đây là màn cảnh báo bình thường
 *      với script tự viết; script này chỉ tạo form trong Drive của bạn.
 *   6. Mở tab "Execution log" (Nhật ký thực thi) ở dưới. Hai dòng Logger.log sẽ
 *      in ra: LINK ĐIỀN (gửi cho tester) và LINK SỬA (để bạn xem câu trả lời).
 *   7. Muốn đổi câu hỏi thì sửa file này rồi Run lại — mỗi lần Run tạo MỘT form
 *      MỚI, không ghi đè form cũ. Form cũ nằm trong Google Drive, xoá tay nếu cần.
 *
 * LƯU Ý VỀ THANG ĐIỂM: các thang "càng cao càng tốt" (hài lòng, dễ hiểu…) và
 * thang ĐỘ KHÓ không cùng hướng. Thang độ khó lấy ĐIỂM GIỮA (3) là lý tưởng:
 * 1 = quá dễ, 5 = quá khó. Mô tả từng câu đã nói rõ để người trả lời không
 * hiểu nhầm là "5 điểm mới là tốt". Đừng cộng trung bình hai loại thang với nhau.
 */

function taoForm() {
  var form = FormApp.create('Khảo sát thử nghiệm khoá Advanced Python — USTH');

  form.setDescription(
    'Cảm ơn bạn đã thử khoá "Advanced Python" (48 bài Python nâng cao chạy trực tiếp '
    + 'trong trình duyệt).\n\n'
    + 'Khảo sát ẩn danh, không bắt buộc để lại tên hay email. Mất khoảng 3–5 phút.\n'
    + 'Xin trả lời theo đúng những gì bạn đã thực sự trải nghiệm hôm nay — kể cả khi '
    + 'bạn chỉ học được một hai bài. Góp ý thẳng thắn có ích hơn góp ý lịch sự.'
  );

  // Khảo sát ẩn danh: không thu email tự động. Có một ô liên hệ TUỲ CHỌN ở cuối
  // cho ai muốn được hỏi lại.
  form.setCollectEmail(false);
  form.setProgressBar(true);
  form.setConfirmationMessage(
    'Đã nhận. Cảm ơn bạn — mỗi câu trả lời ở đây đổi được một thứ trong khoá học.'
  );

  // ===================================================================
  // TRANG 1 — Phần 1: Về bạn  +  Phần 2: Cảm nhận chung
  // ===================================================================
  form.addSectionHeaderItem()
    .setTitle('Phần 1 · Về bạn')
    .setHelpText('Chỉ để tách nhóm khi đọc kết quả. Không hỏi tên, không hỏi email.');

  // Q1
  form.addMultipleChoiceItem()
    .setTitle('1. Bạn thử khoá học với vai trò nào?')
    .setChoiceValues([
      'Giảng viên USTH',
      'Cố vấn / chuyên gia được mời',
      'Sinh viên USTH',
      'Sinh viên trường khác'
    ])
    .showOtherOption(true)
    .setRequired(true);

  // Q2
  form.addMultipleChoiceItem()
    .setTitle('2. Hôm nay bạn học được tới bài thứ mấy?')
    .setHelpText('Chọn mức gần nhất với bài xa nhất bạn mở tới (không cần làm xong hết).')
    .setChoiceValues([
      'Chưa xong bài 1',
      'Bài 1–2',
      'Bài 3–5',
      'Bài 6–10',
      'Bài 11–20',
      'Hơn 20 bài'
    ])
    .setRequired(true);

  form.addSectionHeaderItem()
    .setTitle('Phần 2 · Cảm nhận chung');

  // Q3
  form.addScaleItem()
    .setTitle('3. Mức độ hài lòng tổng thể với khoá học?')
    .setBounds(1, 5)
    .setLabels('1 = rất không hài lòng', '5 = rất hài lòng')
    .setRequired(true);

  // Q4
  form.addScaleItem()
    .setTitle('4. Chất lượng nội dung (đúng kiến thức, đủ sâu, sát giáo trình USTH)?')
    .setHelpText('Nội dung gồm: tiến trình/subprocess, đa luồng, GUI Tkinter, SQL, '
      + 'NumPy, pandas, Matplotlib và dự án phân tích dữ liệu.')
    .setBounds(1, 5)
    .setLabels('1 = rất kém', '5 = rất tốt')
    .setRequired(true);

  // Q5
  form.addScaleItem()
    .setTitle('5. Bạn sẵn sàng giới thiệu khoá này cho đồng nghiệp / sinh viên khác đến mức nào?')
    .setBounds(1, 5)
    .setLabels('1 = chắc chắn không giới thiệu', '5 = chắc chắn sẽ giới thiệu')
    .setRequired(true);

  // ===================================================================
  // TRANG 2 — Phần 3: Quy trình học và độ khó
  // ===================================================================
  form.addPageBreakItem()
    .setTitle('Phần 3 · Quy trình học và độ khó')
    .setHelpText('Mỗi bài đi theo thứ tự: LÝ THUYẾT (định nghĩa + sơ đồ động) → ĐỀ BÀI '
      + '→ GIẢI THÍCH cơ chế → câu hỏi DỰ ĐOÁN → màn ngộ nhận → VIẾT CODE (chạy test thật) '
      + '→ MINI-GAME.');

  // Q6
  form.addScaleItem()
    .setTitle('6. Thứ tự lý thuyết → đề bài → giải thích → làm bài → mini-game có hợp lý với bạn không?')
    .setBounds(1, 5)
    .setLabels('1 = rất rối, sai thứ tự', '5 = rất hợp lý, đi đúng mạch')
    .setRequired(true);

  // Q7 — thang độ khó: ĐIỂM GIỮA là lý tưởng, KHÔNG phải càng cao càng tốt.
  form.addScaleItem()
    .setTitle('7. ĐỘ KHÓ của phần LÝ THUYẾT (định nghĩa, sơ đồ, gạch đầu dòng, màn giải thích)?')
    .setHelpText('Thang này KHÁC các thang trên: ĐIỂM GIỮA MỚI LÀ TỐT. '
      + '1 = quá dễ, 2 = hơi dễ, 3 = vừa sức, 4 = hơi khó, 5 = quá khó.')
    .setBounds(1, 5)
    .setLabels('1 = quá dễ', '5 = quá khó')
    .setRequired(true);

  // Q8
  form.addScaleItem()
    .setTitle('8. ĐỘ KHÓ của phần VIẾT CODE (tự viết hàm rồi chạy test)?')
    .setHelpText('Cũng là thang có ĐIỂM GIỮA LÀ TỐT. '
      + '1 = quá dễ, 2 = hơi dễ, 3 = vừa sức, 4 = hơi khó, 5 = quá khó.')
    .setBounds(1, 5)
    .setLabels('1 = quá dễ', '5 = quá khó')
    .setRequired(true);

  // Q9
  form.addScaleItem()
    .setTitle('9. Cách diễn đạt (câu chữ, thuật ngữ, ví dụ) dễ hiểu đến đâu?')
    // Nhãn hai đầu để ngắn: nhãn dài làm hàng 1–5 bị bóp lại trên điện thoại,
    // nên phần diễn giải đẩy sang helpText.
    .setHelpText('Hỏi về cách NÓI, không hỏi về độ khó của kiến thức. '
      + '1 = rất khó hiểu, phải đọc lại nhiều lần; 5 = rất dễ hiểu, đọc một lượt là nắm.')
    .setBounds(1, 5)
    .setLabels('1 = rất khó hiểu', '5 = rất dễ hiểu')
    .setRequired(true);

  // ===================================================================
  // TRANG 3 — Phần 4: Sơ đồ minh hoạ, trắc nghiệm và mini-game
  // ===================================================================
  form.addPageBreakItem()
    .setTitle('Phần 4 · Sơ đồ minh hoạ, trắc nghiệm và mini-game')
    .setHelpText('Phần lý thuyết của nhiều bài có một SƠ ĐỒ ĐỘNG (hình vẽ chạy từng bước) '
      + 'minh hoạ cơ chế. Nếu bạn chưa gặp hình nào thì bỏ qua ba câu đầu của phần này.');

  // Q10
  form.addScaleItem()
    .setTitle('10. Sơ đồ / đồ thị động có giúp bạn hiểu bài hơn không?')
    .setHelpText('Bỏ trống nếu bạn chưa thấy sơ đồ nào.')
    .setBounds(1, 5)
    .setLabels('1 = không giúp gì', '5 = giúp rất nhiều');

  // Q11
  form.addScaleItem()
    .setTitle('11. Sơ đồ có dễ hình dung / dễ theo dõi không?')
    .setHelpText('Hình có rõ đang diễn tả gì, đi theo được từng bước, không bị rối. '
      + 'Bỏ trống nếu bạn chưa thấy sơ đồ nào.')
    .setBounds(1, 5)
    .setLabels('1 = rất khó hình dung', '5 = rất dễ hình dung');

  // Q12
  form.addMultipleChoiceItem()
    .setTitle('12. Chữ và nhãn TRONG sơ đồ có đọc được không?')
    .setChoiceValues([
      'Đọc rõ ở mọi chỗ',
      'Đa số rõ, vài chỗ chữ nhỏ',
      'Nhiều chỗ chữ quá nhỏ, phải phóng to mới đọc được',
      'Chữ bị tràn ra ngoài hoặc đè lên nhau',
      'Chưa thấy sơ đồ nào'
    ])
    .showOtherOption(true);

  // Q13
  form.addMultipleChoiceItem()
    .setTitle('13. SỐ LƯỢNG câu hỏi trắc nghiệm trong một bài (dự đoán, MCQ, đúng/sai — '
      + 'trung bình khoảng 5 câu mỗi bài)?')
    .setChoiceValues([
      'Quá ít',
      'Hơi ít',
      'Vừa đủ',
      'Hơi nhiều',
      'Quá nhiều, thấy mệt'
    ])
    .setRequired(true);

  // Q14
  form.addMultipleChoiceItem()
    .setTitle('14. SỐ LƯỢNG mini-game trong một bài (ghép cặp, điền chỗ trống, sắp xếp dòng code, '
      + 'săn lỗi, sửa code… — trung bình khoảng 4–5 game mỗi bài)?')
    .setChoiceValues([
      'Quá ít',
      'Hơi ít',
      'Vừa đủ',
      'Hơi nhiều',
      'Quá nhiều, thấy mệt'
    ])
    .setRequired(true);

  // Q15
  form.addCheckboxItem()
    .setTitle('15. Nếu phải BỎ hoặc GIẢM, bạn chọn bỏ loại nào? (chọn nhiều đáp án)')
    .setHelpText('Chọn "Không bỏ loại nào" nếu bạn thấy giữ hết là đúng.')
    .setChoiceValues([
      'Ghép cặp (match)',
      'Điền chỗ trống (fill)',
      'Sắp xếp dòng code (parsons)',
      'Săn lỗi (spotError)',
      'Bảng lần vết biến (traceTable)',
      'Sửa code sai (debug)',
      'Tự giải thích bằng lời (selfExplain)',
      'Đúng / sai (trueFalse)',
      'Trận Boss cuối chặng',
      'Câu hỏi dự đoán trước khi làm bài',
      'Không bỏ loại nào'
    ])
    .showOtherOption(true);

  // ===================================================================
  // TRANG 4 — Phần 5: Tốc độ, sự cố và ý kiến mở
  // ===================================================================
  form.addPageBreakItem()
    .setTitle('Phần 5 · Tốc độ, sự cố và ý kiến')
    .setHelpText('Python chạy ngay trong trình duyệt nên lần đầu phải nạp bộ chạy '
      + '(khoảng 10 MB). Phần này hỏi về chuyện chờ đợi đó và về những gì đã hỏng.');

  // Q16
  form.addMultipleChoiceItem()
    .setTitle('16. Lần ĐẦU bấm Chạy trong một bài, bạn phải chờ Python nạp khoảng bao lâu?')
    .setChoiceValues([
      'Gần như không phải chờ',
      'Dưới 5 giây',
      'Khoảng 5–15 giây',
      'Khoảng 15–30 giây',
      'Hơn 30 giây',
      'Chờ mãi không xong / báo lỗi'
    ]);

  // Q17
  form.addScaleItem()
    .setTitle('17. Sau khi đã nạp xong, các lần bấm Chạy / Nộp sau có mượt không?')
    .setHelpText('1 = rất chậm, giật, phải chờ lâu; 5 = rất mượt, có kết quả gần như ngay.')
    .setBounds(1, 5)
    .setLabels('1 = rất chậm', '5 = rất mượt');

  // Q18
  form.addParagraphTextItem()
    .setTitle('18. Bạn gặp lỗi hay sự cố gì? Ghi càng cụ thể càng tốt.')
    .setHelpText('Nếu nhớ được: bài nào (mã bài hoặc số bài), bạn đang làm gì, màn hình báo gì, '
      + 'dùng trình duyệt / máy nào. Không gặp lỗi thì ghi "không".');

  // Q19
  form.addParagraphTextItem()
    .setTitle('19. Điều bạn THÍCH NHẤT ở khoá học này là gì?');

  // Q20
  form.addParagraphTextItem()
    .setTitle('20. Nếu chỉ được sửa MỘT thứ trước khi dạy thật, bạn sửa gì?')
    .setHelpText('Câu quan trọng nhất của khảo sát. Xin nêu một thứ cụ thể, không cần dài.')
    .setRequired(true);

  // Q21 — tuỳ chọn, để giữ tính ẩn danh: ai không muốn thì bỏ trống.
  form.addTextItem()
    .setTitle('21. (Tuỳ chọn) Email hoặc tên, nếu bạn đồng ý để chúng tôi hỏi thêm')
    .setHelpText('Bỏ trống hoàn toàn được — khảo sát này ẩn danh.');

  // ===================================================================
  // In ra hai đường dẫn: một để gửi tester, một để tác giả xem và sửa.
  // ===================================================================
  Logger.log('LINK ĐIỀN (gửi cho tester): ' + form.getPublishedUrl());
  Logger.log('LINK SỬA (chỉ bạn dùng):    ' + form.getEditUrl());
  Logger.log('Tổng số câu: 21 (20 câu nội dung + 1 ô liên hệ tuỳ chọn). Bắt buộc: 12 câu.');
}
