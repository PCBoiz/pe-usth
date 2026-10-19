/**
 * `requestId` do `RequestIdMiddleware` gắn vào request để mọi response lỗi và
 * mọi dòng log cùng một request đều mang một mã tra cứu.
 *
 * Trước đây ba chỗ cùng ép `(req as any).requestId` — middleware để GHI, hai
 * exception filter để ĐỌC. Mỗi lần ép là một lỗ `any`: `(req as any).requestID`
 * (hoa chữ D) vẫn biên dịch, filter đọc ra `undefined` và mọi response lỗi trả
 * `request_id: null` mà không có gì đỏ lên — đúng lúc cần tra log nhất thì
 * không tra được. Khai một lần ở đây để TS canh cả ba chỗ.
 *
 * Khai dưới dạng tuỳ chọn (`?`) vì nó là sự thật: route nào không đi qua
 * middleware thì không có mã, và filter đã có nhánh `?? null` cho trường hợp đó.
 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export {};
