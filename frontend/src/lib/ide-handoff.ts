/**
 * Chuyển một đoạn mã từ trang bài học sang /ide (nút "Thử ngay trong IDE").
 *
 * VÌ SAO LÀ FRAGMENT (#) CHỨ KHÔNG PHẢI QUERY (?):
 * nút mở /ide ở TAB MỚI để bài học không mất trạng thái, nên phải nhét mã vào
 * chính đường dẫn — và mở tab mới là một lần tải trang THẬT, tức đường dẫn đi
 * qua máy chủ Next. Mã bài dài tới vài nghìn ký tự:
 *  - `?code=…` đi vào dòng yêu cầu HTTP. Node giới hạn phần đầu yêu cầu ở 16 KB
 *    (`--max-http-header-size`), vượt là 431 — trang trắng, không phải mã sai.
 *    Nó cũng lọt vào log truy cập của máy chủ/CDN, hoàn toàn vô ích ở đó.
 *  - `#code=…` KHÔNG được trình duyệt gửi đi: máy chủ chỉ thấy `/ide`. Không có
 *    trần header, không vào log, và vẫn là một LINK bình thường (bấm giữa chuột,
 *    copy dán, mở lại đều ra đúng mã) — khác hẳn localStorage/sessionStorage,
 *    vốn đứt khi mở bằng chuột giữa (không có sự kiện click) hoặc khi tab mới
 *    không thừa hưởng sessionStorage.
 *
 * VÌ SAO BASE64URL CHỨ KHÔNG PHẢI encodeURIComponent: mã bài có dấu tiếng Việt;
 * percent-encoding ăn 9 ký tự cho mỗi chữ có dấu (3 byte × "%XX"), base64 chỉ ăn
 * 4 ký tự cho mỗi 3 byte. Dùng biến thể base64url (`-` `_`, bỏ `=`) để không
 * phải nghĩ về chuyện trình duyệt hay thư viện nào đó mã hoá lại dấu `+` `/` `=`.
 *
 * Mọi dữ liệu ở đây đến từ địa chỉ người dùng gõ được, nên decode phải coi như
 * dữ liệu bẩn: sai một ký tự là trả null để /ide dùng ví dụ mặc định, chứ không
 * được để trang nổ.
 */

/** Tên tham số trong fragment: `/ide#code=…`. */
export const IDE_CODE_PARAM = 'code';

/**
 * Trần của mã nguồn (ký tự) được phép bàn giao. Mã dài nhất trong giáo trình
 * hiện nay khoảng 1.700 ký tự (scripts/pe-v4/out-advanced), nên 16.000 là rất
 * rộng rãi; đặt trần để một bài soạn lỗi không dựng ra đường dẫn dài vô hạn.
 */
export const MAX_IDE_CODE_CHARS = 16_000;

/** Trần của phần đã mã hoá khi ĐỌC — chặn địa chỉ bịa dài vô tội vạ. */
export const MAX_IDE_PARAM_CHARS = 32_000;

function bytesToBase64Url(bytes: Uint8Array): string {
  // Không dùng String.fromCharCode(...bytes): spread hàng nghìn phần tử vào một
  // lời gọi hàm có thể vượt trần tham số của engine (RangeError).
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Mã hoá đoạn mã cho fragment. null = không bàn giao được (rỗng, hoặc dài quá
 * trần) — chỗ gọi hiểu là KHÔNG hiện nút, đừng mở IDE rỗng cho người học đoán.
 */
export function encodeIdeCode(code: string): string | null {
  if (!code.trim() || code.length > MAX_IDE_CODE_CHARS) return null;
  const encoded = bytesToBase64Url(new TextEncoder().encode(code));
  return encoded.length > MAX_IDE_PARAM_CHARS ? null : encoded;
}

/**
 * Giải mã tham số lấy từ địa chỉ. null = tham số méo/thiếu/dài quá → /ide giữ
 * ví dụ mặc định. Chặn cả ký tự điều khiển: dữ liệu nhị phân tình cờ đúng UTF-8
 * vẫn không phải mã Python, không có lý gì dán vào editor.
 */
export function decodeIdeCode(raw: string | null | undefined): string | null {
  if (!raw || raw.length > MAX_IDE_PARAM_CHARS) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  try {
    // fatal: true để chuỗi byte không phải UTF-8 bị ném lỗi thay vì biến thành
    // một rừng ký tự "�".
    const text = new TextDecoder('utf-8', { fatal: true }).decode(base64UrlToBytes(raw));
    if (!text.trim() || text.length > MAX_IDE_CODE_CHARS) return null;
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(text)) return null;
    return text;
  } catch {
    return null;
  }
}

/** Địa chỉ của nút "Thử ngay trong IDE". null = không bàn giao được. */
export function ideCodeHref(code: string): string | null {
  const encoded = encodeIdeCode(code);
  return encoded && `/ide#${IDE_CODE_PARAM}=${encoded}`;
}

/** Đọc mã bàn giao từ `window.location.hash` (truyền vào cả dấu `#` cũng được). */
export function readIdeCodeFromHash(hash: string | null | undefined): string | null {
  if (!hash) return null;
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return decodeIdeCode(params.get(IDE_CODE_PARAM));
}
