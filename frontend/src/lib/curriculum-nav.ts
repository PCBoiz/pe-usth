// Tìm module chứa một bài, theo CHỈ SỐ PHẲNG của bài trong khoá.
//
// VÌ SAO LÀ FILE RIÊNG chứ không nằm trong CourseDetail.tsx: nó là phép tính
// duy nhất trong đường "đóng bài → mở lại đúng chỗ" mà sai được một cách IM
// LẶNG. Lệch một bài thì nó vẫn mở ra MỘT module, vẫn trông như chạy đúng, và
// chỉ sai ở bài đầu/cuối của mỗi module — tức đúng loại lỗi không ai nhìn ra
// bằng mắt. Ở đây thì ca test gọi thẳng được nó với cả 172 bài thật.
//
// Không import gì: tham số là dữ liệu chứ không phải `curricula.json`, nên file
// test nạp được bằng đường dẫn tương đối (alias `@/` thì `node --test` không
// phân giải).

/** Chỉ cần đếm số bài — phần còn lại của module không liên quan tới phép này. */
export type ModuleCoBai = { lessons: unknown[] };

/**
 * Chỉ số module (0-based) chứa bài `idx` (0-based), hoặc -1 nếu `idx` nằm
 * ngoài khoá.
 *
 * Trả -1 chứ KHÔNG kẹp về 0: `?lesson=` đến từ URL, ai cũng gõ được. Kẹp về 0
 * thì một số rác lại mở module 1 và cuộn lung tung, trong khi điều đúng là
 * không làm gì cả và để trang ở trạng thái mặc định.
 */
export function moduleChuaBai(modules: ModuleCoBai[], idx: number): number {
  if (!Number.isInteger(idx) || idx < 0) return -1;
  let dem = 0;
  for (let mi = 0; mi < modules.length; mi += 1) {
    dem += modules[mi].lessons.length;
    if (idx < dem) return mi;
  }
  return -1;
}
