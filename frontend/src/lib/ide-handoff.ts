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

/*
 * ---------------------------------------------------------------------------
 * GIỮ MÃ QUA MỘT LẦN TẢI LẠI TRANG (nút "Thử lại" của trình soạn thảo dự phòng)
 * ---------------------------------------------------------------------------
 *
 * "Thử lại" ở /ide phải TẢI LẠI TRANG (lý do ở retryEditor trong
 * src/app/ide/IdeClient.tsx: loader của Monaco giữ lời từ chối cũ suốt vòng đời
 * trang). Bản đầu chỉ nhét mã vào fragment bằng ideCodeHref() — mà hàm đó trả
 * null khi mã quá 16.000 ký tự hoặc mã hoá ra quá trần; khi ấy trang vẫn tải lại
 * và người dùng mất sạch bài, trong khi chú thích hứa "thử lại KHÔNG mất bài"
 * (người chấm độc lập bắt được, 14/10/2026). Đúng kiểu người hay mất bài nhất:
 * người đã gõ dài trong ô dự phòng suốt buổi vì Monaco không lên.
 *
 * Thứ tự cất mã:
 *  1. fragment — như nút "Thử ngay trong IDE", sống cả qua F5 về sau;
 *  2. sessionStorage — tải lại là CÙNG TAB nên vẫn còn. Ở đây không có vấn đề
 *     "tab mới không thừa hưởng" đã nêu ở đầu file, vì không mở tab mới nào;
 *  3. không cất được cả hai (trình duyệt chặn bộ nhớ, hết hạn mức) → KHÔNG tải
 *     lại. Chỗ gọi phải báo người dùng chép mã ra trước — tải lại mù là mất bài.
 */

/** Khoá sessionStorage giữ mã qua lần tải lại của nút "Thử lại". */
export const IDE_RELOAD_CODE_KEY = 'pe-ide:reload-code';

/**
 * Trần của mã cất vào sessionStorage: 200.000 ký tự (~400 KB UTF-16).
 *
 * Vì sao phải có trần RIÊNG, không mượn trần 16.000 của fragment: đường
 * sessionStorage sinh ra chính vì fragment chật, nên nó phải rộng hơn — nhưng
 * KHÔNG được vô hạn. `setItem` nhận tới hạn mức ~5 MB, nên dán một tệp 4 MB vào
 * ô gõ dự phòng rồi bấm "Thử lại" là lần tải sau nhồi 4 MB vào <textarea> rồi
 * vào Monaco: trình duyệt khựng hàng giây, đúng lúc người ta đang cố cứu bài.
 * 200.000 ký tự đã gấp 12 lần trần fragment và gấp hơn 100 lần đoạn mã dài nhất
 * trong giáo trình (~1.700 ký tự) — dài hơn thế thì không còn là "bài đang gõ".
 * Vượt trần thì rơi về `ok: false`: thà bảo người dùng chép mã ra còn hơn tự ý
 * tải lại rồi treo trang.
 */
export const MAX_IDE_SESSION_CODE_CHARS = 200_000;

/** Phần của Storage mà ở đây cần — để test truyền được bộ nhớ giả. */
export type IdeCodeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * `ok: true`  — gọi `history.replaceState(null, '', href)` rồi `location.reload()`.
 *               `via` nói mã nằm ở đâu ('none' = không có gì đáng giữ: ô gõ trống).
 * `ok: false` — KHÔNG tải lại được mà không mất mã.
 */
export type IdeReloadPlan =
  | { ok: true; href: string; via: 'fragment' | 'session' | 'none' }
  | { ok: false };

/**
 * `window.sessionStorage` hoặc null. Chỉ ĐỌC thuộc tính này thôi cũng có thể ném
 * SecurityError (Chrome chặn dữ liệu trang, iframe bị cô lập) — nên phải bọc,
 * không thì nút "Thử lại" nổ ngay chỗ đáng lẽ chỉ là "không cất được".
 */
export function sessionStorageOrNull(): IdeCodeStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    // SecurityError. Đây là LÝ DO hàm tồn tại, không phải nhánh phòng xa:
    // không bọc thì nút "Thử lại" nổ ngay chỗ đáng lẽ chỉ là "không cất được".
    return null;
  }
}

function forget(storage: IdeCodeStorage | null): void {
  try {
    storage?.removeItem(IDE_RELOAD_CODE_KEY);
  } catch {
    // Không xoá được bản cũ thì thôi: readIdeCodeOnLoad() cho fragment thắng,
    // và chính trang sẽ thử xoá lại sau khi mount.
  }
}

/**
 * Cất `code` sao cho lần tải lại sau trả về đúng nó. Hàm có tác dụng phụ duy
 * nhất là ghi/xoá trên `storage` được truyền vào; còn đổi địa chỉ và tải lại là
 * việc của chỗ gọi, nên test chạy được bằng `node --test` không cần trình duyệt.
 */
export function planIdeReload(code: string, storage: IdeCodeStorage | null): IdeReloadPlan {
  if (!code.trim()) {
    // Ô gõ trống: không có gì để mất. Bỏ cả fragment cũ (nếu có), không thì
    // tải lại hiện ra mã của lần bàn giao trước — trông như trang tự gõ hộ.
    forget(storage);
    return { ok: true, href: '/ide', via: 'none' };
  }

  // Kiểm VÒNG ĐI–VỀ chứ không chỉ "mã hoá được": encodeIdeCode() nhận ký tự
  // điều khiển (form feed dán từ PDF chẳng hạn) nhưng decodeIdeCode() lại chặn
  // chúng — nên fragment dựng được mà tải lại vẫn ra ví dụ mặc định, mất bài
  // một cách im lặng. Đi–về không trọn thì xuống sessionStorage.
  const encoded = encodeIdeCode(code);
  if (encoded && decodeIdeCode(encoded) === code) {
    // Bản cũ trong sessionStorage (của một lần thử lại trước) phải bỏ đi, kẻo
    // nó sống lại ở một lần mở /ide sau trong cùng tab.
    forget(storage);
    return { ok: true, href: `/ide#${IDE_CODE_PARAM}=${encoded}`, via: 'fragment' };
  }

  // Quá trần của đường sessionStorage thì không cất nữa (xem
  // MAX_IDE_SESSION_CODE_CHARS): tải lại được nhưng trang treo thì cũng như mất.
  if (!storage || code.length > MAX_IDE_SESSION_CODE_CHARS) return { ok: false };
  try {
    storage.setItem(IDE_RELOAD_CODE_KEY, code);
    // Đọc lại cho chắc: có trình duyệt (Safari riêng tư đời cũ) nhận setItem
    // mà không lưu gì. Tin lời "đã lưu" rồi tải lại là mất bài.
    if (storage.getItem(IDE_RELOAD_CODE_KEY) !== code) return { ok: false };
  } catch {
    // QuotaExceededError (mã dài hơn hạn mức ~5 MB) hoặc bộ nhớ bị chặn.
    return { ok: false };
  }
  // Địa chỉ trần, BỎ fragment cũ: readIdeCodeOnLoad() cho fragment thắng, nên
  // để nguyên fragment của lần bàn giao trước thì nó sẽ đè lên mã vừa cất.
  return { ok: true, href: '/ide', via: 'session' };
}

/**
 * Mã để mở /ide: fragment trước, rồi bản cất của nút "Thử lại", không có thì
 * null (chỗ gọi dùng ví dụ mặc định).
 *
 * Vì sao fragment THẮNG: planIdeReload() đi đường sessionStorage thì đã bỏ
 * fragment khỏi địa chỉ, nên có fragment nghĩa là có một lần bàn giao MỚI HƠN
 * (người dùng bấm "Thử ngay trong IDE" mở /ide ngay trong tab này) — khi đó bản
 * cất cũ là đồ thừa, không được đè lên.
 */
export function readIdeCodeOnLoad(
  hash: string | null | undefined,
  storage: IdeCodeStorage | null,
): string | null {
  const fromHash = readIdeCodeFromHash(hash);
  if (fromHash !== null) return fromHash;
  try {
    const saved = storage?.getItem(IDE_RELOAD_CODE_KEY);
    // Không qua decodeIdeCode(): đây là mã chính người dùng gõ, do chính trang
    // này ghi, không phải địa chỉ ai cũng sửa được — lọc ký tự điều khiển ở
    // đây là làm mất đúng cái ca đã buộc phải xuống sessionStorage.
    return typeof saved === 'string' && saved.trim() ? saved : null;
  } catch {
    return null;
  }
}

/**
 * Xoá bản cất sau khi đã nạp vào editor. Gọi trong effect, KHÔNG gọi trong hàm
 * khởi tạo state: hàm đó phải thuần (StrictMode cố ý gọi nó hai lần để lộ tác
 * dụng phụ), còn effect chạy sau khi giá trị đã nằm trong state. Không xoá thì
 * F5 hay mở lại /ide trong tab này về sau sẽ hiện lại mã cũ thay cho ví dụ mặc
 * định, dù người dùng đã gõ sang bài khác.
 */
export function forgetIdeReloadCode(storage: IdeCodeStorage | null): void {
  forget(storage);
}
