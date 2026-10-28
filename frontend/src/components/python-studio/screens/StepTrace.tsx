'use client';

// BẢNG TỪNG BƯỚC của một khối code ở màn đọc — "một dạng python tracer trong lý
// thuyết", chữ của chủ dự án.
//
// ĐÂY KHÔNG PHẢI code visualizer của `/ide`. Cái kia bước qua chương trình của
// NGƯỜI HỌC, có call stack đầy đủ, có panel biến, và nó nạp 30 MB Pyodide. Cái
// này gắn với ĐÚNG khối code của bài, vết đã TÍNH SẴN lúc build (xem ReadTrace),
// nên nó mở ra tức thì và không tải thêm gì.
//
// BA điều được ghim ở đây, mỗi điều có ca test riêng:
//
//  1. ẨN SẴN, và mở ra thì HỎI DỰ ĐOÁN TRƯỚC. Bước dự đoán là CƠ CHẾ, không
//     phải trang trí: Hundhausen 2002 tổng hợp 24 thực nghiệm có đối chứng —
//     chỉ 46% cho kết quả có ý nghĩa, 42% KHÔNG, và khi Gurka lặp lại thí
//     nghiệm nhưng BỎ điều kiện "dự đoán trước" thì lợi thế biến mất. Brod 2021
//     nói ra vì sao: đoán sai → ngạc nhiên → chú ý dồn vào đáp án đúng. Nên nút
//     "Mở bảng" chỉ bật khi người học đã GÕ một câu trả lời. Đó là ma sát CÓ
//     CHỦ ĐÍCH, và nó là thứ duy nhất phân biệt bảng này với một cái bảng mà
//     ai cũng cuộn qua.
//
//  2. CHỮ THẬT, không <img>, không <canvas>. Cùng lý do khối `diagram` tồn tại:
//     ba trên bốn người trả lời khảo sát 29/10/2026 chọn "chữ và nhãn TRONG sơ
//     đồ quá nhỏ" — chữ trong ảnh thì SCALE, chữ của trang thì REFLOW. Và một
//     <table> thật thì trình đọc màn hình đọc được tên cột khi nhảy ô, dịch
//     được, copy được.
//
//  3. KHÔNG tự chạy lại code ở màn đọc. Màn đọc KHÔNG có ô soạn mã (xem
//     ReadScreen: khối `code` dựng CodeBlock — chỉ đọc). Chỗ sửa code rồi chạy
//     lại là `/ide`, và nút "Thử ngay trong IDE" ngay dưới đây đã bàn giao đúng
//     đoạn mã sang đó. Dựng thêm một ô soạn mã ở màn đọc là dựng lại /ide trong
//     một cái accordion.
import { Fragment, useState } from 'react';

// `khopDapAn` nằm ở src/lib/studio-lesson.ts, không ở đây: runner của bộ test
// (`node --test --experimental-strip-types`) không nạp được JSX, nên logic để
// trong một file `.tsx` là logic chỉ kiểm được bằng cách đọc chuỗi nguồn.
//
// Dù KHỚP hay KHÔNG thì bảng vẫn mở: đây là bước cam kết, không phải bài thi.
// Giấu bảng của người đoán sai là lấy đi đúng thứ họ cần nhất lúc đó.
import { khopDapAn, type ReadTrace, type TraceRow } from '@/lib/studio-lesson';

import c from '../studio-chrome.module.css';
import { paragraphs } from './chrome';

/** Diễn biến của một bước, thành các mẩu chữ ngắn. */
function dienBien(r: TraceRow) {
  const mau: { khoa: string; chu: string }[] = [];
  for (const [ten, gt] of r.set ?? []) mau.push({ khoa: `set-${ten}`, chu: `${ten} = ${gt}` });
  if (r.ret !== undefined) mau.push({ khoa: 'ret', chu: `trả về ${r.ret}` });
  if (r.exc) mau.push({ khoa: 'exc', chu: `ném ${r.exc}` });
  return mau;
}

export default function StepTrace({ trace, code }: { trace: ReadTrace; code: string }) {
  const [moPanel, setMoPanel] = useState(false);
  const [doan, setDoan] = useState('');
  // `null` = chưa nộp. Giữ lại sau khi đóng bảng: bắt người học đoán LẠI cùng
  // một câu khi họ mở ra xem lần hai là ma sát vô nghĩa — lần đó họ đã biết.
  const [daNop, setDaNop] = useState<string | null>(null);
  const dong = code.split('\n');

  if (!moPanel) {
    return (
      <p className={c.traceRow}>
        <button
          type="button"
          className={c.traceOpen}
          // Không `aria-controls`: lúc đóng thì panel chưa có trong DOM, và
          // một `aria-controls` trỏ vào id không tồn tại là lỗi a11y thật.
          // `aria-expanded` một mình đã là khuôn disclosure hợp lệ.
          aria-expanded={false}
          onClick={() => setMoPanel(true)}
        >
          Xem từng bước
          <span aria-hidden="true"> ▸</span>
        </button>
      </p>
    );
  }

  const khop = daNop !== null && khopDapAn(daNop, trace.predict.answer);

  return (
    <section className={c.trace} aria-label="Bảng từng bước của đoạn code trên">
      {daNop === null ? (
        // CỔNG DỰ ĐOÁN. Không có đường nào đi tắt qua đây, và đó là chủ đích —
        // xem lý lẽ ở đầu file.
        <form
          className={c.tracePredict}
          onSubmit={(e) => {
            e.preventDefault();
            if (doan.trim()) setDaNop(doan.trim());
          }}
        >
          <p className={c.tracePredictAsk}>
            <strong>Đoán trước đã:</strong> {paragraphs(trace.predict.prompt)}
          </p>
          <p className={c.tracePredictWhy}>
            Đoán sai cũng được — chính lúc thấy mình đoán sai là lúc bảng dưới đây
            đáng xem nhất. Xem mà không đoán thì gần như không đọng lại gì.
          </p>
          <span className={c.tracePredictLine}>
            <input
              className={c.tracePredictInput}
              value={doan}
              onChange={(e) => setDoan(e.target.value)}
              placeholder="câu trả lời của bạn"
              aria-label={trace.predict.prompt.replace(/`/g, '')}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className={c.tracePredictGo} disabled={!doan.trim()}>
              Mở bảng
            </button>
          </span>
        </form>
      ) : (
        <>
          <p className={khop ? c.traceVerdictOk : c.traceVerdictNo}>
            {khop ? 'Khớp. ' : 'Chưa khớp. '}
            <span className={c.traceVerdictNote}>
              Bạn đoán <code>{daNop}</code>
              {khop ? '' : <> — đáp án là <code>{trace.predict.answer}</code></>}.
            </span>
          </p>
          <div className={c.traceTable}>
            <table>
              <caption>
                Từng bước chạy của đoạn code trên: dòng nào vừa chạy, biến nào đổi,
                và chương trình in ra gì.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Dòng</th>
                  <th scope="col">Lệnh vừa chạy</th>
                  <th scope="col">Sau đó</th>
                </tr>
              </thead>
              <tbody>
                {trace.rows.map((r, i) => (
                  <Fragment key={i}>
                    {trace.elided && trace.elidedAt === i ? (
                      <tr className={c.traceElided}>
                        <td colSpan={3}>
                          … {trace.elided} bước ở giữa không hiện (chúng lặp lại cùng
                          một dòng) …
                        </td>
                      </tr>
                    ) : null}
                    <tr>
                      <th scope="row">
                        {r.line}
                        {r.fn ? <span className={c.traceFn}>trong {r.fn}()</span> : null}
                      </th>
                      <td>
                        {/* Lấy chữ của dòng từ CHÍNH `block.code` chứ không lưu
                            lại trong vết: lưu lại là chép đôi mã của bài vào
                            content_json, và hai bản chép thì sớm muộn lệch. */}
                        <code
                          className={c.traceCode}
                          style={r.depth ? { paddingLeft: Math.min(r.depth, 3) * 10 } : undefined}
                        >
                          {(dong[r.line - 1] ?? '').replace(/\s+$/, '') || ' '}
                        </code>
                        {r.enter ? <span className={c.traceEnter}>vào hàm</span> : null}
                      </td>
                      <td>
                        {dienBien(r).map((m) => (
                          <code key={m.khoa} className={c.traceSet}>
                            {m.chu}
                          </code>
                        ))}
                        {r.out ? (
                          <span className={c.traceOut}>
                            in ra: <code>{r.out}</code>
                          </span>
                        ) : null}
                        {!dienBien(r).length && !r.out ? (
                          <span className={c.traceNone} aria-label="không đổi gì">
                            —
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <p className={c.traceRow}>
            <button type="button" className={c.traceOpen} onClick={() => setMoPanel(false)}>
              Đóng bảng
              <span aria-hidden="true"> ▾</span>
            </button>
          </p>
        </>
      )}
    </section>
  );
}
