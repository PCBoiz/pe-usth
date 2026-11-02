/**
 * MỘT bản khai duy nhất cho `req.requestId`.
 *
 * VÌ SAO. Trước file này, cùng một hợp đồng được viết lại ở BỐN chỗ, mỗi chỗ
 * một kiểu, và không chỗ nào kiểm được chỗ nào:
 *   · `request-id.middleware.ts` — `(req as any).requestId = …`  (bên GHI)
 *   · `all-exceptions.filter.ts` — `request.requestId` trên một `any`
 *   · `prisma-exception.filter.ts` — `(request as any).requestId`
 *   · `overload-protection.middleware.ts` — `(req as unknown as { requestId?: string })`
 * Bốn bản mô tả của một thứ là bốn thứ có thể TRÔI khỏi nhau: đổi tên trường ở
 * middleware thì ba bên đọc vẫn biên dịch sạch và lặng lẽ trả `request_id: null`
 * trên mọi response lỗi — đúng họ bẫy mà AGENTS.md đã ghi nhiều lần.
 *
 * `?` chứ không bắt buộc: middleware chỉ chạy trên đường HTTP đã đăng ký, nên
 * một Request dựng trong test hoặc đến từ đường khác thật sự có thể chưa có
 * trường này. Khai bắt buộc là nói dối theo chiều ngược lại.
 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export {};
