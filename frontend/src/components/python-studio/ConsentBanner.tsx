'use client';

// HỘP XIN ĐỒNG Ý cho lớp ghi nhật ký lần thử.
//
// VÌ SAO NÓ TỒN TẠI: lớp ghi (frontend/src/lib/learning-events.ts +
// src/learning-events/) đã dựng xong và nằm im, vì chưa có đường nào để người
// học nói được "có" hay "không". Dữ liệu theo dõi hành vi là dữ liệu NHẠY CẢM
// theo Luật 91/2025 + Nghị định 356/2025, và Điều 9(4) nói nguyên văn rằng "sự
// im lặng hoặc không phản hồi không được coi là sự đồng ý" — nên KHÔNG có đường
// nào bật lớp ghi mà không đi qua một cái hộp như thế này.
//
// BA THỨ Ở ĐÂY LÀ YÊU CẦU, KHÔNG PHẢI THẨM MỸ:
//
//  1. HAI NÚT NGANG NHAU. Không "Đồng ý" to màu xanh cạnh một dòng chữ xám "bỏ
//     qua". Sự đồng ý phải TỰ NGUYỆN, và một thiết kế làm việc từ chối khó thấy
//     hơn là một thiết kế lấy sự đồng ý bằng ma sát — thứ đó không phải sự đồng
//     ý theo nghĩa của luật. Vì vậy hai nút cùng cỡ, cùng độ nổi.
//
//  2. KHÔNG CÓ NÚT ĐÓNG (×), và không tự tắt sau mấy giây. Đóng hộp mà không
//     trả lời là "im lặng", và im lặng không được coi là đồng ý — nhưng nếu hộp
//     đóng được thì nó sẽ hiện lại lần sau, và một hộp hiện lại mãi là cách ép
//     đồng ý bằng sự mệt mỏi. Nên: phải trả lời MỘT lần, rồi không bao giờ thấy
//     nữa (xem `canHoiLai` ở backend — người đã từ chối KHÔNG bị hỏi lại).
//
//  3. NÓI THẲNG CÁI GÌ BỊ GHI, kể cả cái KHÔNG bị ghi. Hai dòng "không gửi mã
//     Python của bạn, kể cả hash" và "không có tên/email" là hai câu hỏi đầu
//     tiên người ta thật sự có — bỏ chúng đi thì người học phải tự đoán, và họ
//     sẽ đoán theo hướng xấu.
//
// Nguyên văn nằm ở `MO_TA_PHAM_VI` trong frontend/src/lib/log-consent.ts, cạnh
// phiên bản mà nó mô tả — không phải trong file này. Lý do: khi phạm vi thu thập
// đổi, ca ghim ở learning-event-consent.spec.ts đỏ và câu dặn ở đó trỏ tới ĐÚNG
// MỘT chỗ phải sửa.
import { useState } from 'react';

import { MO_TA_PHAM_VI } from '@/lib/log-consent';

import c from './consent-banner.module.css';

export default function ConsentBanner({
  onDecide,
}: {
  /** Gửi quyết định. Trả về khi máy chủ đã GHI, nên hộp chỉ biến mất sau đó. */
  onDecide: (granted: boolean) => Promise<void>;
}) {
  const [dangGui, setDangGui] = useState<null | 'yes' | 'no'>(null);

  async function quyet(granted: boolean) {
    // Chặn bấm đúp: bảng `learning_event_consents` là append-only KHÔNG có khoá
    // unique (có chủ đích — phải ghi được cả lần rút lại), nên bấm đúp sinh hai
    // hàng. Vô hại về kết quả, nhưng không có lý do gì để sinh rác.
    if (dangGui) return;
    setDangGui(granted ? 'yes' : 'no');
    try {
      await onDecide(granted);
    } finally {
      // Mở lại nút nếu hộp vẫn còn đây — tức máy chủ không ghi được. Để nút
      // khoá mãi là người học mắc kẹt với một hộp không bấm được.
      setDangGui(null);
    }
  }

  return (
    // `role="dialog"` + `aria-modal={false}`: nó là một hộp cần trả lời, nhưng
    // KHÔNG chặn bài học — người học đọc bài bình thường trong lúc chưa trả lời.
    // Chặn bài học để lấy sự đồng ý là đúng định nghĩa của sự đồng ý bị cưỡng
    // chế.
    <section
      className={c.hop}
      role="dialog"
      aria-modal={false}
      aria-labelledby="consent-title"
    >
      <h2 id="consent-title" className={c.tieuDe}>
        {MO_TA_PHAM_VI.tieuDe}
      </h2>

      <p className={c.dungDeLam}>{MO_TA_PHAM_VI.dungDeLam}</p>

      <div className={c.haiCot}>
        <div>
          <p className={c.nhan}>Chúng tôi ghi lại</p>
          <ul className={c.danh}>
            {MO_TA_PHAM_VI.thu.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className={c.nhan}>Chúng tôi KHÔNG ghi</p>
          <ul className={`${c.danh} ${c.khong}`}>
            {MO_TA_PHAM_VI.khongThu.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className={c.phu}>
        {MO_TA_PHAM_VI.hanLuu} {MO_TA_PHAM_VI.rutLai}
      </p>

      {/* Hai nút CÙNG CỠ, CÙNG ĐỘ NỔI — xem lý do 1 ở đầu file. Thứ tự đặt
          "Không" TRƯỚC: nút cuối cùng là nút tay phải chạm đầu tiên trên điện
          thoại, và mặc định đó không nên là nút đồng ý. */}
      <div className={c.nut}>
        <button
          type="button"
          className={c.chon}
          disabled={dangGui !== null}
          onClick={() => void quyet(false)}
        >
          {dangGui === 'no' ? 'Đang lưu…' : 'Không, cảm ơn'}
        </button>
        <button
          type="button"
          className={c.chon}
          disabled={dangGui !== null}
          onClick={() => void quyet(true)}
        >
          {dangGui === 'yes' ? 'Đang lưu…' : 'Đồng ý'}
        </button>
      </div>
    </section>
  );
}
