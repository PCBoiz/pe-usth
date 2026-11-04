/**
 * CHỜ SỐ CÓ TRẦN — nhưng số về MUỘN thì không được VỨT.
 *
 * VÌ SAO FILE NÀY TỒN TẠI: trang chủ Góc học dựng cảnh bằng
 * `Promise.race([laySo(...), chờ 3 s])`. Quá 3 giây thì dựng với người dùng
 * TRỐNG — đúng ý, để cảnh không treo chờ máy chủ — nhưng khi số thật về sau đó
 * thì không ai dùng nó nữa. Đo trên production 04/11/2026 (be7b382): một tài
 * khoản khách đã xong PY01 + PY02, năm lượt API đều 200, `/api/enrolled` mất
 * 3 087 ms — thua trần 87 ms — và cả phiên trang chủ nói "Chưa có phiên học trên
 * máy này", ô tiến độ "—". Máy chủ nghỉ dậy thì lượt đầu > 25 s (AGENTS.md), tức
 * người quay lại học sau một quãng nghỉ LUÔN gặp đúng ca này.
 *
 * Hàm thuần theo nghĩa không đụng React/DOM: nhận một promise và một hàm dựng,
 * nên ca test gọi thẳng được bằng đồng hồ thật vài chục ms.
 */

/**
 * Dựng ngay khi có số, hoặc dựng bằng `duPhong` khi quá `tranMs` — rồi nếu số
 * thật về SAU đó thì dựng LẠI đúng một lần với `muon = true`.
 *
 * Trả về hàm huỷ: gọi rồi thì không lần dựng nào xảy ra nữa (component đã gỡ).
 * Promise bị từ chối thì coi như không bao giờ có số — giữ bản dự phòng.
 */
export function choSoCoTran<T>(
  lay: Promise<T>,
  tranMs: number,
  duPhong: T,
  dung: (giaTri: T, muon: boolean) => void,
): () => void {
  let huy = false;
  let daDung = false;
  const hen = setTimeout(() => {
    if (huy || daDung) return;
    daDung = true;
    dung(duPhong, false);
  }, tranMs);
  lay.then(
    (v) => {
      if (huy) return;
      clearTimeout(hen);
      const muon = daDung;
      daDung = true;
      dung(v, muon);
    },
    () => {
      /* Không có số thì bản dự phòng (đã hoặc sẽ dựng ở mốc trần) là đúng. */
    },
  );
  return () => {
    huy = true;
    clearTimeout(hen);
  };
}
