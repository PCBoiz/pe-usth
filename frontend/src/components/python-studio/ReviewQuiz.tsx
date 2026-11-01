'use client';

// Ô ĐỀ ÔN TẬP ở màn tổng kết — ĐƯỜNG DUY NHẤT tới hệ thống quiz chấm ở máy chủ.
//
// VÌ SAO ĐẶT Ở ĐÂY, và vì sao không đặt ở trang khoá học:
//  · `apiFetch` gặp 401 là TỰ TẠO tài khoản khách (`ensureGuest`), nên một
//    trang CÔNG KHAI gọi API nghĩa là mỗi bot quét web sinh một tài khoản
//    `@guest.local` và ăn hết `THROTTLE_GUEST_LIMIT` (120 lượt/giờ/IP). Trang
//    chủ và `/courses/*` vì vậy KHÔNG gọi API nào cả — đó là cơ chế thật đang
//    chặn chuyện đó, không phải một hàm fetch cẩn thận. Màn tổng kết nằm trong
//    `/lesson/*`, nơi người học đã có danh tính để lưu tiến độ.
//  · Và nó phải nằm SAU khi bài được ghi nhận hoàn thành: pool của
//    `buildQuestionPool` chỉ gồm bài `lesson_progress.status = 'completed'`,
//    nên hỏi trước lúc đó là đếm thiếu đúng bài họ vừa học xong.
//
// Ô này KHÔNG được nằm dưới nút "Hoàn thành ✓" của màn tổng kết — xem `extra`
// trong Recap.tsx. Một đường đi mà người dùng phải cuộn qua nút kết thúc để
// tìm thì trên thực tế nó không tồn tại, đúng cái bệnh của repo này.
import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api';
import {
  apDungChon,
  cauCuaCong,
  daChonHet,
  docDe,
  docDeDangLam,
  docDeKhoiPhuc,
  docKetQua,
  docTrangThai,
  ghiDeDangLam,
  goiDapAn,
  nhanDiem,
  soCauTrongDe,
  thongDiepLoi,
  viTriDung,
  xoaDeDangLam,
  type DeOn,
  type KetQuaCham,
  type TrangThaiDeOn,
} from '@/lib/review-quiz';

import c from './review-quiz.module.css';

/** Gọi API rồi trả body + câu lỗi đã dịch; không ném, để mọi nhánh nói được. */
async function goi(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; body: unknown; loi: string }> {
  try {
    const res = await apiFetch(path, init);
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, body, loi: thongDiepLoi(body, res.status) };
    return { ok: true, body, loi: '' };
  } catch {
    // Mất mạng / CORS: `apiFetch` ném, và một ô trống ở đây trông y như "chưa
    // có đề ôn cho bài này" — hai chuyện khác hẳn nhau.
    return { ok: false, body: null, loi: 'Không nối được máy chủ. Kiểm tra mạng rồi thử lại.' };
  }
}

export default function ReviewQuiz({ courseId }: { courseId: string }) {
  const [trangThai, setTrangThai] = useState<TrangThaiDeOn | null>(null);
  const [dangDoc, setDangDoc] = useState(true);
  const [de, setDe] = useState<DeOn | null>(null);
  const [chon, setChon] = useState<Array<number | null>>([]);
  const [ketQua, setKetQua] = useState<KetQuaCham | null>(null);
  const [dangGoi, setDangGoi] = useState(false);
  const [loi, setLoi] = useState('');
  /**
   * Lúc PHÁT đề đang mở, ms. Phải là STATE chứ không tính lại lúc ghi: hạn 7
   * ngày bó TUỔI của đề, nên một đề khôi phục về phải giữ nguyên mốc cũ — lấy
   * `Date.now()` ở mỗi lượt ghi là mỗi lần mở lại ô này lại gia hạn thêm 7
   * ngày, tức hạn đó không bao giờ tới.
   */
  const [lucPhat, setLucPhat] = useState(0);
  /** Điểm của đề ĐÃ NỘP, khôi phục từ `GET quizzes/:id` — xem `docDeKhoiPhuc`. */
  const [daNop, setDaNop] = useState<{ diem: number; tong: number } | null>(null);

  const khoa = encodeURIComponent(courseId);

  // HỎI TRƯỚC khi hiện nút: `GET /api/courses/:id/quiz/status` trả số câu rút
  // được và ngưỡng của máy chủ, nên ô này nói được "còn thiếu mấy bài" thay vì
  // để người học bấm rồi nhận lỗi. `setState` nằm trong callback của promise,
  // KHÔNG trong thân effect — React 19 chặn setState đồng bộ trong thân
  // (`react-hooks/set-state-in-effect`), và luật đó đúng.
  //
  // VÀ nạp lại ĐỀ ĐANG LÀM nếu lần trước bỏ dở: `quiz_id` chỉ sống trong state
  // React, nên trước bản này một lần F5 là mất đề — hàng `quizzes` kẹt ở
  // `generated` vĩnh viễn và người học chỉ còn đường phát một đề khác. Luật
  // (cất ở đâu, đã nộp thì sao, bỏ dở bao lâu thì thôi) nằm ở `review-quiz.ts`.
  //
  // SONG SONG, không nối đuôi: hai lượt này không phụ thuộc nhau, và repo này
  // đã trả giá một lần cho ba lượt API tuần tự ở màn mở bài (3,7 giây).
  useEffect(() => {
    let song = true;
    // Đọc đĩa ngay trong thân effect là được — đây không phải `setState`, thứ
    // mà React 19 chặn (`react-hooks/set-state-in-effect`).
    const luu = docDeDangLam(courseId);
    void (async () => {
      const [rTt, rDe] = await Promise.all([
        goi(`/api/courses/${khoa}/quiz/status`),
        luu ? goi(`/api/quizzes/${luu.quizId}`) : Promise.resolve(null),
      ]);
      if (!song) return;
      if (!rTt.ok) setLoi(rTt.loi);
      else setTrangThai(docTrangThai(rTt.body));

      if (luu && rDe) {
        const kp = rDe.ok ? docDeKhoiPhuc(rDe.body) : null;
        if (!kp) {
          // 404 (đề của tài khoản khách CŨ — hết hạn refresh là `ensureGuest()`
          // cấp tài khoản mới), hoặc body không đọc được. Xoá rồi hiện cổng
          // thường: KHÔNG báo lỗi, vì người học không nhớ mình có đề mở dở nên
          // một câu nói về nó chỉ gây hoang mang.
          xoaDeDangLam(courseId);
        } else if (kp.loai === 'daNop') {
          // Đề này đã nộp xong (nộp lần hai là 409). Không dựng lại thành "đang
          // làm" — xem quyết định 2 trong `review-quiz.ts`.
          xoaDeDangLam(courseId);
          setDaNop({ diem: kp.diem, tong: kp.tong });
        } else {
          setDe(kp.de);
          setChon(apDungChon(kp.de, luu.chon));
          setLucPhat(luu.luc);
        }
      }
      setDangDoc(false);
    })();
    return () => {
      song = false;
    };
  }, [courseId, khoa]);

  // TỰ LƯU đề đang làm sau mỗi lần đổi phương án. Ghi trong effect (không phải
  // trong hàm cập nhật state) để một chỗ duy nhất lo việc ghi: phát đề mới và
  // bấm phương án đều đi qua đây, nên không có đường nào vào trạng thái "đang
  // làm" mà quên ghi. Đã nộp thì dừng ghi — `nop()` đã xoá bản lưu.
  useEffect(() => {
    if (!de || ketQua) return;
    ghiDeDangLam(courseId, { quizId: de.quizId, luc: lucPhat, chon });
  }, [courseId, de, chon, ketQua, lucPhat]);

  const phatDe = useCallback(async () => {
    setDangGoi(true);
    setLoi('');
    // `generate-review` chứ không `generate`: cùng pool, cùng khuôn response,
    // khác đúng bước bốc câu — bên này ưu tiên bài người học hay sai (trọng số
    // 1..2 theo tỉ lệ sai, nên bài nào cũng còn cơ hội). Với một ô "ôn tập"
    // thì đó là hành vi đúng; `generate` random đều vẫn còn đó cho đường khác.
    const r = await goi(`/api/courses/${khoa}/quiz/generate-review`, { method: 'POST' });
    setDangGoi(false);
    if (!r.ok) return setLoi(r.loi);
    const d = docDe(r.body);
    if (!d) return setLoi('Máy chủ trả về một đề không đọc được. Thử lại sau.');
    setDe(d);
    setChon(d.cauHoi.map(() => null));
    setKetQua(null);
    setDaNop(null);
    // Mốc tuổi của đề. Effect tự lưu ở trên ghi nó xuống đĩa ngay sau render.
    setLucPhat(Date.now());
  }, [khoa]);

  const nop = useCallback(async () => {
    if (!de) return;
    setDangGoi(true);
    setLoi('');
    const r = await goi(`/api/quizzes/${de.quizId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `answers` phải ĐỦ ĐỘ DÀI và ĐÚNG THỨ TỰ — `submitQuiz` chấm
      // `answers[i]` cho câu thứ i của snapshot. Xem `goiDapAn`.
      body: JSON.stringify({ answers: goiDapAn(chon, de.cauHoi.length) }),
    });
    setDangGoi(false);
    // XOÁ bản lưu dù nộp được hay không: nhánh !ok thường nhất ở đây là 409
    // "đã được nộp" (bấm đúp, hoặc một tab khác nộp trước), và giữ lại một id
    // đã nộp chỉ để mỗi lần mở màn tổng kết lại tốn một lượt `GET quizzes/:id`
    // rồi rơi vào nhánh `daNop`. Đề nộp được thì cũng không còn gì để nhớ.
    xoaDeDangLam(courseId);
    if (!r.ok) return setLoi(r.loi);
    const kq = docKetQua(r.body);
    if (!kq) return setLoi('Đã nộp nhưng không đọc được kết quả. Tải lại trang để xem lại.');
    setKetQua(kq);
  }, [chon, courseId, de]);

  if (dangDoc) {
    return (
      <section className={c.hop} aria-busy="true">
        <h3 className={c.tieuDe}>
          <span aria-hidden="true">📝</span> Đề ôn tập
        </h3>
        <p className={c.moTa}>Đang xem bạn đã mở được đề ôn chưa…</p>
      </section>
    );
  }

  return (
    <section className={c.hop}>
      <h3 className={c.tieuDe}>
        <span aria-hidden="true">📝</span> Đề ôn tập · chấm ở máy chủ
      </h3>

      {/* ĐỀ TRƯỚC ĐÃ NỘP, khôi phục từ `GET quizzes/:id` sau một lần tải lại.
          Chỉ có ĐIỂM, không dựng lại danh sách câu: response của đề đã nộp
          không mang `questions`, và `detail` thì không mang `options` — dựng
          một màn đề mà mọi phương án trống thì tệ hơn là nói đúng một nửa. */}
      {!de && daNop && (
        <p className={c.moTa}>
          Đề ôn lần trước bạn đã nộp xong — {daNop.diem}/{daNop.tong} câu đúng. Mỗi đề chỉ
          nộp được một lần, nên lần này là một đề mới.
        </p>
      )}

      {/* CHƯA có đề: hiện cổng (mở được / còn thiếu mấy BÀI). */}
      {!de && trangThai && <p className={c.moTa}>{cauCuaCong(trangThai)}</p>}
      {!de && trangThai?.moDuoc && (
        <button type="button" className={c.nut} onClick={() => void phatDe()} disabled={dangGoi}>
          {dangGoi ? 'Đang lấy đề…' : `Làm đề ôn ${soCauTrongDe(trangThai.soCau)} câu →`}
        </button>
      )}

      {/* ĐANG làm / ĐÃ chấm. Cùng một danh sách câu: sau khi chấm chỉ thêm màu
          và lời giải thích, không dựng lại màn khác — người học cần thấy đúng
          phương án mình đã chọn, cạnh phương án đúng. */}
      {de && (
        <>
          {!ketQua && (
            <p className={c.moTa}>
              {de.cauHoi.length} câu. Đáp án do máy chủ chấm, và mỗi đề chỉ nộp được MỘT lần.
            </p>
          )}
          {de.cauHoi.map((q, i) => {
            const ct = ketQua?.chiTiet[i];
            const dung = ct ? viTriDung(ct.correct, q.options) : null;
            return (
              <div className={c.cau} key={`${q.index}-${i}`}>
                <p className={c.deBai}>
                  <span className={c.soCau}>
                    Câu {i + 1}/{de.cauHoi.length}
                  </span>
                  {q.question}
                </p>
                <div className={c.danhPhuongAn} role="group" aria-label={`Câu ${i + 1}`}>
                  {q.options.map((o, j) => {
                    const daChon = chon[i] === j;
                    const lop = [c.phuongAn];
                    if (ketQua) {
                      if (dung === j) lop.push(c.laDung);
                      else if (daChon) lop.push(c.laSai);
                    } else if (daChon) lop.push(c.daChon);
                    return (
                      // <label> bọc radio: bấm vào chữ cũng chọn được và trình
                      // đọc màn hình đọc được nhóm — div + onClick mất cả hai.
                      <label className={lop.join(' ')} key={j}>
                        <input
                          type="radio"
                          name={`de-${de.quizId}-cau-${i}`}
                          checked={daChon}
                          disabled={Boolean(ketQua) || dangGoi}
                          onChange={() =>
                            setChon((truoc) => {
                              const sau = [...truoc];
                              sau[i] = j;
                              return sau;
                            })
                          }
                        />
                        <span>{o}</span>
                      </label>
                    );
                  })}
                </div>
                {/* LỜI GIẢI THÍCH của máy chủ — chỉ có SAU khi chấm
                    (`stripAnswers` không gửi nó lúc phát đề). Đây là phần có
                    tác dụng lớn nhất của phản hồi (d = 0,49 so với 0,05 cho
                    "đúng/sai" trần), nên nó ở tương phản đầy đủ. */}
                {ct?.giaiThich && <p className={c.giaiThich}>{ct.giaiThich}</p>}
              </div>
            );
          })}

          {!ketQua && (
            <button
              type="button"
              className={c.nut}
              onClick={() => void nop()}
              disabled={dangGoi || !daChonHet(chon, de.cauHoi.length)}
            >
              {dangGoi
                ? 'Đang nộp…'
                : daChonHet(chon, de.cauHoi.length)
                  ? 'Nộp đề →'
                  : 'Chọn hết các câu để nộp'}
            </button>
          )}

          {ketQua && (
            <>
              <p className={c.diem}>
                <span aria-hidden="true">🎯</span> {nhanDiem(ketQua)}
              </p>
              {/* MẪU SỐ, không phần trăm — và nói ra giới hạn của con số này.
                  Ba câu của một bài sinh từ MỘT gốc câu hỏi, nên đây là chỉ số
                  nội bộ của khoá chứ không phải một mức năng lực. */}
              <p className={c.ghiChu}>
                Điểm này không vào XP của bài và không thay điểm bài học — nó là đề ôn.
                Mỗi đề chỉ nộp một lần; bấm nút dưới để lấy một đề mới.
              </p>
              <button type="button" className={c.nutPhu} onClick={() => void phatDe()} disabled={dangGoi}>
                {dangGoi ? 'Đang lấy đề…' : 'Lấy đề ôn khác'}
              </button>
            </>
          )}
        </>
      )}

      {loi && (
        <p className={c.loi} role="status">
          {loi}
        </p>
      )}
    </section>
  );
}
