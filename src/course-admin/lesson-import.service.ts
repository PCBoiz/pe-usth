import { createRequire } from 'module';
import { pathToFileURL } from 'url';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  STUDIO_LESSON_SCHEMA,
  validateStudioLesson,
  type Mcq,
  type StudioLesson,
} from './studio-lesson.schema';

/**
 * Nhập bài học từ `.md` / `.txt` / `.pdf` theo MỘT bộ quy ước duy nhất
 * (`LESSON-IMPORT-FORMAT.md`).
 *
 * VÌ SAO KHÔNG CÒN NHÁNH AI. Bản đầu có `parseWithGemini()`: file nào không
 * khớp mẫu thì đẩy nguyên văn sang Gemini và tin vào JSON nó trả về. Chủ dự án
 * đã chốt tắt hẳn nhánh đó, và bản thân đường ấy cũng sai về chất: nội dung
 * bài học là thứ phải ĐÚNG, mà một bộ suy đoán thì không nói được nó đã bịa
 * chỗ nào. Thay vào đó, file lệch mẫu bị TỪ CHỐI kèm câu nói rõ thiếu gì ở đâu
 * — người soạn sửa file, không ai phải đọc dò một bản nháp do máy đoán.
 *
 * VÌ SAO PARSE TRẢ VỀ DANH SÁCH LỖI chứ không trả `null`. Bản đầu trả `null`
 * khi không nhận ra cấu trúc, và `null` không nói được gì: người soạn nhận
 * đúng một câu "file không theo mẫu" cho cả chục nguyên nhân khác nhau. Nay
 * mỗi luật hỏng là một dòng chỉ thẳng phần nào, thiếu gì.
 *
 * HỢP ĐỒNG: `errors` rỗng ⇒ `lesson` đã qua `validateStudioLesson()` — cùng
 * cửa mà `planLessonInserts`/`selectLessons` đi qua. Bộ parse KHÔNG được phép
 * phát ra một bài mà cửa vào DB sẽ từ chối, càng không được phát ra một bài
 * lọt cửa rồi mở lên trắng trơn.
 */

/** Tên tài liệu mẫu — mọi câu lỗi đều chỉ về đây, đừng ghi tay chuỗi này. */
export const FORMAT_DOC = 'LESSON-IMPORT-FORMAT.md';

/**
 * Loại khối màn đọc mà bộ parse này phát ra.
 *
 * Màn đọc có SÁU loại (`READ_BLOCK_TYPES` trong frontend/src/lib/studio-lesson.ts):
 * paragraph · code · terminal · figure · table · diagram. Ở đây chỉ phát BỐN —
 * `figure` cần file PNG cùng miền dưới /static/ (tài liệu nhập vào không mang
 * theo ảnh) và `diagram` là dữ liệu có cấu trúc không rút được từ văn xuôi.
 *
 * Danh sách này là HẰNG để bộ test đối chiếu được "loại khối parse phát ra"
 * với "loại khối renderer biết dựng". Nó quan trọng hơn vẻ ngoài:
 * `validateStudioLesson` KHÔNG kiểm loại khối của màn đọc (xem ca "KHIẾM
 * KHUYẾT ĐÃ BIẾT" trong lesson-insert.spec.ts), nên một loại lạ đi lọt vào DB
 * rồi BIẾN MẤT IM LẶNG ở nhánh `default` của ReadScreen. Hàng rào duy nhất
 * hôm nay là việc chính hàm `khoiDoc()` chỉ biết viết ra bốn chuỗi này.
 */
export const READ_BLOCK_TYPES_EMITTED = [
  'paragraph',
  'code',
  'terminal',
  'table',
] as const;

export type ImportedReadBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'code'; code: string; expected?: string }
  | { type: 'terminal'; code: string; expected?: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

export type ParseOutcome = {
  /** `null` khi tài liệu hỏng tới mức không dựng được gì. */
  lesson: StudioLesson | null;
  errors: string[];
  warnings: string[];
};

export type ImportResult = {
  lesson: StudioLesson;
  /** Chỉ còn MỘT bộ parse. Giữ trường này để bản xem trước nói ra được. */
  parser: 'template';
  warnings: string[];
};

type Block = { heading: string; body: string[] };

/**
 * Nạp `pdf-parse` bằng `require` CHẬM (chỉ khi thật sự có file PDF), KHÔNG
 * bằng `await import()`.
 *
 * Vì sao: tsconfig đặt `module: nodenext`, nên TS GIỮ NGUYÊN `import()` động
 * thay vì hạ xuống `require`. Node thật chạy được, nhưng vm của Jest thì ném
 * `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG` — tức nhánh đọc PDF là nhánh
 * KHÔNG THỂ có test, trừ khi đổi lệnh chạy jest của cả repo. Đã gặp: ba ca
 * test PDF đầu tiên trượt đúng vì chuyện này.
 *
 * `pdf-parse` có bản CJS thật (`exports.require` → dist/pdf-parse/cjs), nên
 * `require` là đường được chính gói đó hỗ trợ, không phải lách.
 */
const napCJS = createRequire(__filename);

// ───────────────────── Bóc PDF GIỮ THỤT LỀ (theo toạ độ) ─────────────────────

/**
 * Một mẩu chữ của pdfjs, rút gọn về đúng những thứ phép dựng lại cần.
 *
 * `getTextContent()` trả mỗi mẩu kèm ma trận `transform`; `transform[4]`,
 * `transform[5]` là x, y của gốc chữ, `transform[3]` là cỡ chữ theo chiều dọc.
 * Kiểu này là HỢP ĐỒNG giữa phần ĐỌC FILE (cần pdfjs, không chạy được dưới
 * Jest) và phần DỰNG LẠI (thuần, Jest chạy được) — xem `dungVanBanTuToaDo`.
 */
export type MauChu = {
  x: number;
  y: number;
  /** Cỡ chữ theo chiều dọc (pt) — làm thước cho ngưỡng gộp dòng. */
  cao: number;
  /** Bề rộng cả mẩu chữ (pt). */
  rong: number;
  font: string;
  chu: string;
};

export type VanBanTheoToaDo = {
  text: string;
  /**
   * Có đo được MỘT LƯỚI CHỮ ĐỀU BỀ không. `false` ⇒ cột chữ không suy ra
   * được ⇒ thụt lề trong `text` KHÔNG đáng tin, đừng dùng.
   */
  deuBe: boolean;
  /** Câu mô tả số đo thật, để log nói ra được vì sao nó quyết định như vậy. */
  doDuoc: string;
};

/**
 * Bao nhiêu phần của các phép đo bề rộng phải trùng nhau thì mới gọi một font
 * là ĐỀU BỀ (monospace). Đo trên `samples/lesson-fstring.pdf`: 100% của 1214
 * cặp mẩu chữ liền nhau VÀ 100% của 687 mẩu chữ không-trắng đều ra 4,9508 pt.
 * Ngưỡng 0,9 để chừa chỗ cho vài mẩu lạ (chữ ghép, ký tự rộng gấp đôi), nhưng
 * vẫn đủ xa 1/3 — tỉ lệ mà một font TỈ LỆ (Arial, Times) rơi vào.
 */
export const NGUONG_DEU_BE = 0.9;

/**
 * Hai bề rộng lệch nhau dưới 2% thì coi là MỘT.
 *
 * KHÔNG so bằng `===` trên số thực: toạ độ pdfjs là kết quả nhân ma trận, nên
 * cùng một bề rộng ra 4.9508 chỗ này và 4.95079999 chỗ kia. Repo đã có bài học
 * họ này (`config.get<number>()` chỉ ép kiểu lúc biên dịch).
 */
export const SAI_SO_BE_RONG = 0.02;

/**
 * Dưới ngần này phép đo thì KHÔNG kết luận gì về font.
 *
 * Một font chỉ xuất hiện ở 3 mẩu chữ mà cả 3 cùng bề rộng là chuyện tình cờ,
 * không phải bằng chứng monospace — mà kết luận sai ở đây đẻ ra thụt lề sai,
 * tức đúng thứ tệ hơn một lời từ chối.
 */
export const TOI_THIEU_PHEP_DO = 20;

function trungVi(xs: readonly number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[(s.length - 1) >> 1];
}

/** Giá trị xuất hiện nhiều nhất (làm tròn về bội 0,5). Hoà thì lấy số nhỏ hơn. */
function phoBienNhat(xs: readonly number[]): number {
  const dem = new Map<number, number>();
  for (const x of xs) {
    const k = Math.round(x * 2) / 2;
    dem.set(k, (dem.get(k) ?? 0) + 1);
  }
  let ra = 0;
  let nhieu = -1;
  for (const [k, n] of dem) {
    if (n > nhieu || (n === nhieu && k < ra)) {
      ra = k;
      nhieu = n;
    }
  }
  return ra;
}

type DongChu = { trang: number; y: number; mau: MauChu[] };

/**
 * Dựng lại văn bản TỪ TOẠ DỘ CHỮ, giữ được thụt lề.
 *
 * VÌ SAO HÀM NÀY TỒN TẠI. `pdf-parse.getText()` bóc văn bản PHẲNG: mọi khoảng
 * trắng đầu dòng biến mất, nên thân hàm Python về cột 0. Đo trên chính
 * `samples/lesson-fstring.pdf` của repo — `{{slot1}}` và cả thân
 * `format_scores` đều mất thụt lề, `validateStudioLesson` không đọc nội dung mã
 * nên không chặn được, và nếu lọt thì bài vào DB rồi ném `IndentationError` ở
 * tay học viên. Hàng rào `kiemThutLe()` vì vậy TỪ CHỐI mọi PDF — tức mọi bài có
 * code Python nhiều dòng không nhập được, với một khoá lập trình thì đó là nửa
 * tính năng chết.
 *
 * VÌ SAO LÀM ĐƯỢC. pdfjs trả x, y của từng mẩu chữ. Trong một tài liệu dựng
 * bằng font ĐỀU BỀ, cột của một mẩu chữ là `(x - lề trái) / bề rộng một ký tự`
 * — một phép chia, không phải phỏng đoán. Cả hai số đều ĐO ĐƯỢC từ chính file.
 *
 * VÌ SAO HÀM NÀY THUẦN. Nhánh đọc file PDF cần pdfjs, mà pdfjs `import()` động
 * để dựng "fake worker" nên vm của Jest ném
 * `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG`. Tách đôi: phần ĐỌC nằm ở
 * `docMauChuPdf()` (chạy thật bằng ts-node), phần DỰNG LẠI — tức toàn bộ phần
 * có thể sai — nằm ở đây và Jest chấm được bằng toạ độ THẬT chụp từ file PDF
 * thật (`__fixtures__/pdf-mau-chu.json`).
 *
 * VÌ SAO CÓ CỜ `deuBe` THAY VÌ LUÔN TRẢ VỀ THỤT LỀ. Với font TỈ LỆ, phép chia
 * trên không có nghĩa, và một bộ bóc "gần đúng" đưa code sai thụt lề vào bài
 * học TỆ HƠN một lời từ chối thẳng — `IndentationError` ở tay học viên là lỗi
 * không ai truy được về PDF. Đo không ra lưới đều bề thì nói ra, và người gọi
 * quay về đúng đường cũ (pdf-parse phẳng → `kiemThutLe` từ chối như trước).
 */
export function dungVanBanTuToaDo(
  trangs: readonly (readonly MauChu[])[],
): VanBanTheoToaDo {
  const tatCa = trangs.flat();
  if (!tatCa.length) {
    return { text: '', deuBe: false, doDuoc: 'không có mẩu chữ nào' };
  }

  // 1) Gộp mẩu chữ thành DÒNG theo y. Ngưỡng tính theo cỡ chữ, không phải một
  //    hằng số pt: tài liệu 8pt và tài liệu 20pt có khoảng dòng khác hẳn nhau.
  const cao = trungVi(tatCa.map((m) => m.cao).filter((h) => h > 0)) || 10;
  const nguongDong = Math.max(0.5, 0.3 * cao);
  const dong: DongChu[] = [];
  trangs.forEach((mau, trang) => {
    const theoY = [...mau].sort((a, b) => b.y - a.y || a.x - b.x);
    let hienTai: DongChu | null = null;
    for (const m of theoY) {
      // So với y của mẩu ĐẦU dòng, không với y của mẩu vừa thêm: so kiểu sau
      // thì sai số dồn lại và hai dòng sát nhau dính làm một.
      if (!hienTai || Math.abs(hienTai.y - m.y) > nguongDong) {
        hienTai = { trang, y: m.y, mau: [m] };
        dong.push(hienTai);
      } else {
        hienTai.mau.push(m);
      }
    }
  });
  for (const d of dong) d.mau.sort((a, b) => a.x - b.x);

  // 2) Đo bề rộng một ký tự, THEO TỪNG FONT. Hai nguồn số đo, cố ý:
  //    · bước nhảy giữa hai mẩu chữ liền nhau — đúng cả khi mẩu chữ là một ký
  //      tự lẻ, nhưng cần ít nhất hai mẩu trên một dòng;
  //    · bề rộng của chính mẩu chữ — đúng cả với PDF chỉ phát MỘT mẩu cho cả
  //      dòng (nhiều bộ xuất PDF làm thế), và đó là lý do không bỏ nguồn này.
  //    Mẩu chữ TRẮNG bị loại khỏi nguồn thứ hai: đo được trên file mẫu là
  //    pdfjs báo bề rộng 6,60 cho một dấu cách mà bước nhảy thật là 4,95.
  const phepDo = new Map<string, number[]>();
  const them = (font: string, r: number) => {
    if (!(r > 0)) return;
    const cu = phepDo.get(font);
    if (cu) cu.push(r);
    else phepDo.set(font, [r]);
  };
  for (const d of dong) {
    for (let i = 0; i < d.mau.length; i++) {
      const m = d.mau[i];
      const soKyTu = [...m.chu].length;
      if (!soKyTu) continue;
      if (m.chu.trim() && m.rong > 0) them(m.font, m.rong / soKyTu);
      const ke = d.mau[i + 1];
      if (ke && ke.font === m.font) them(m.font, (ke.x - m.x) / soKyTu);
    }
  }

  const beRong = new Map<string, number>();
  const moTa: string[] = [];
  for (const [font, ds] of phepDo) {
    const giua = trungVi(ds);
    if (ds.length < TOI_THIEU_PHEP_DO || !(giua > 0)) {
      moTa.push(`${font}: ${ds.length} phép đo — quá ít để kết luận`);
      continue;
    }
    const khop = ds.filter(
      (r) => Math.abs(r - giua) <= SAI_SO_BE_RONG * giua,
    ).length;
    const ty = khop / ds.length;
    if (ty >= NGUONG_DEU_BE) beRong.set(font, giua);
    moTa.push(
      `${font}: ${ds.length} phép đo, ${(100 * ty).toFixed(1)}% quanh ` +
        `${giua.toFixed(3)} pt ⇒ ${ty >= NGUONG_DEU_BE ? 'ĐỀU BỀ' : 'tỉ lệ'}`,
    );
  }

  // 3) Lề trái của mỗi font ĐỀU BỀ = x NHỎ NHẤT trong các dòng mở đầu bằng font
  //    đó. Phải là NHỎ NHẤT chứ không phải phổ biến nhất: trong một khối mã,
  //    phần lớn dòng là thân hàm (đã thụt vào), nên lấy giá trị phổ biến là lấy
  //    nhầm mức thụt của thân hàm làm cột 0 — cả khối lệch, và lệch ĐỀU nên
  //    `kiemThutLe()` không thấy gì.
  const le = new Map<string, number>();
  for (const d of dong) {
    const dau = d.mau[0];
    if (!beRong.has(dau.font)) continue;
    const cu = le.get(dau.font);
    if (cu === undefined || dau.x < cu) le.set(dau.font, dau.x);
  }

  // 4) Dòng trống: suy từ khoảng cách dòng phổ biến nhất. Markdown cần dòng
  //    trống để tách đoạn, mà pdf-parse bỏ sạch chúng.
  const khoang: number[] = [];
  for (let i = 1; i < dong.length; i++) {
    if (dong[i].trang !== dong[i - 1].trang) continue;
    const g = dong[i - 1].y - dong[i].y;
    if (g > 0) khoang.push(g);
  }
  const buocDong = phoBienNhat(khoang);

  const ra: string[] = [];
  for (let i = 0; i < dong.length; i++) {
    const d = dong[i];
    const truoc = dong[i - 1];
    // Ranh giới TRANG: không chèn dòng trống nào. Khoảng cách giữa dòng cuối
    // trang này và dòng đầu trang sau không nói lên điều gì — và trên file mẫu
    // trang 1 kết thúc GIỮA một khối ```python, nên chèn một dòng trống ở đó là
    // cắt đôi khối mã.
    if (truoc && truoc.trang === d.trang && buocDong > 0) {
      const trong = Math.round((truoc.y - d.y) / buocDong) - 1;
      // Trần 2: một khoảng trắng lớn (quanh hình vẽ, cuối mục) không được biến
      // thành hàng chục dòng rỗng.
      for (let k = 0; k < Math.min(Math.max(trong, 0), 2); k++) ra.push('');
    }
    ra.push(dungMotDong(d.mau, beRong, le, cao));
  }

  return {
    text: ra.join('\n'),
    deuBe: beRong.size > 0,
    doDuoc:
      `${tatCa.length} mẩu chữ / ${dong.length} dòng / ${trangs.length} trang; ` +
      moTa.join('; '),
  };
}

/** Dựng MỘT dòng: đặt từng mẩu chữ vào đúng cột của nó. */
function dungMotDong(
  mau: readonly MauChu[],
  beRong: ReadonlyMap<string, number>,
  le: ReadonlyMap<string, number>,
  cao: number,
): string {
  const font = mau[0].font;
  const w = beRong.get(font);
  const goc = le.get(font);

  if (w === undefined || goc === undefined) {
    // Dòng thuộc font TỈ LỆ: không có cột nào để suy. Nối theo thứ tự x, chèn
    // MỘT dấu cách khi có khoảng hở — đúng bằng thứ pdf-parse vẫn làm. KHÔNG
    // đoán thụt lề đầu dòng ở đây: đoán sai thì code vào bài sai mà không ai
    // thấy, mà văn xuôi thì thụt lề vốn không quan trọng.
    let s = '';
    for (let i = 0; i < mau.length; i++) {
      const m = mau[i];
      if (i > 0) {
        const truoc = mau[i - 1];
        const ho = m.x - (truoc.x + truoc.rong);
        if (ho > 0.25 * cao && !/\s$/.test(s) && !/^\s/.test(m.chu)) s += ' ';
      }
      s += m.chu;
    }
    return s.replace(/\s+$/, '');
  }

  let s = '';
  for (const m of mau) {
    const cot = Math.max(0, Math.round((m.x - goc) / w));
    if (cot > s.length) s = s.padEnd(cot, ' ');
    s += m.chu;
  }
  return s.replace(/\s+$/, '');
}

/**
 * Rút lề chung của từng khối ```…``` về 0.
 *
 * VÌ SAO CẦN. Cột 0 của `dungVanBanTuToaDo` là lề trái của font — thường là lề
 * của văn xuôi. Một bộ xuất PDF thụt cả khối mã vào trong (khung, viền, lề
 * riêng) sẽ cho ra khối mã thụt ĐỀU k cột. Thụt đều thì `kiemThutLe()` KHÔNG
 * thấy gì sai (quan hệ giữa các dòng vẫn đúng), nhưng Python thì ném
 * `IndentationError` ngay dòng đầu — đúng thứ hỏng im lặng mà cả đường nhập này
 * ra đời để chặn.
 *
 * Phép rút lề tính TRÊN CẢ hai dòng ``` lẫn thân khối, đúng như CommonMark quy
 * định cho code fence thụt vào, nên khối mã vốn ở cột 0 không bị đụng tới.
 */
export function rutLeKhoiMa(text: string): string {
  const dong = text.split('\n');
  const ra = [...dong];
  let mo = -1;
  for (let i = 0; i < dong.length; i++) {
    if (!dong[i].trimStart().startsWith('```')) continue;
    if (mo < 0) {
      mo = i;
      continue;
    }
    let le = Infinity;
    for (let k = mo; k <= i; k++) {
      if (!dong[k].trim()) continue;
      le = Math.min(le, dong[k].length - dong[k].trimStart().length);
    }
    if (le > 0 && le < Infinity) {
      for (let k = mo; k <= i; k++) {
        if (dong[k].trim()) ra[k] = dong[k].slice(le);
      }
    }
    mo = -1;
  }
  return ra.join('\n');
}

/** Fence ngôn ngữ nào là LỆNH TERMINAL, không phải Python. */
const LANG_TERMINAL = new Set([
  'bash',
  'sh',
  'shell',
  'console',
  'terminal',
  'cmd',
]);
/** Fence ngôn ngữ nào là ĐẦU RA của khối ngay trên nó. */
const LANG_OUTPUT = new Set(['output', 'text', 'ketqua']);

/** Tách một khối dòng thành các mục theo mức heading (## hoặc ###). */
function splitByHeading(lines: string[], marker: string): Block[] {
  const prefix = `${marker} `;
  const blocks: Block[] = [];
  let currentHead = '';
  let buffer: string[] = [];
  let fenced = false;

  const flush = () => {
    if (currentHead || buffer.length) {
      blocks.push({ heading: currentHead, body: buffer });
    }
    buffer = [];
  };

  for (const line of lines) {
    if (line.trimStart().startsWith('```')) fenced = !fenced;
    // Heading chỉ tính khi ĐANG NGOÀI code fence — nếu không, một dòng
    // `### comment` trong code Python sẽ cắt nhầm bài học làm đôi.
    if (!fenced && line.startsWith(prefix)) {
      flush();
      currentHead = line.slice(prefix.length).trim();
      continue;
    }
    buffer.push(line);
  }
  flush();
  return blocks;
}

/** Nội dung của code fence đầu tiên (kèm ngôn ngữ nếu cần lọc). */
function firstFence(lines: string[], lang?: string): string | null {
  let open = false;
  let matched = false;
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('```')) {
      if (!open) {
        const tag = trimmed.slice(3).trim().toLowerCase();
        open = true;
        matched = !lang || tag === '' || tag === lang;
        continue;
      }
      if (matched) return out.join('\n');
      open = false;
      matched = false;
      out.length = 0;
      continue;
    }
    if (open && matched) out.push(line);
  }
  return null;
}

/** Văn xuôi: bỏ code fence, heading con và các dòng danh sách. */
function prose(lines: string[]): string {
  const out: string[] = [];
  let fenced = false;
  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const t = line.trim();
    if (!t || t.startsWith('#') || /^[-*]\s/.test(t) || /^\d+\.\s/.test(t))
      continue;
    out.push(t);
  }
  return out.join(' ').trim();
}

function stripTicks(text: string): string {
  return text
    .trim()
    .replace(/^`+|`+$/g, '')
    .trim();
}

/** `- [x] A. Tiêu đề — mô tả` */
type ParsedOption = { title: string; detail?: string; correct: boolean };

function parseOptions(lines: string[]): ParsedOption[] {
  const options: ParsedOption[] = [];
  let fenced = false;
  for (const line of lines) {
    if (line.trimStart().startsWith('```')) fenced = !fenced;
    if (fenced) continue;
    const m = /^\s*[-*]\s*\[([ xX])\]\s*(?:[A-Za-z][.)]\s*)?(.+)$/.exec(line);
    if (!m) continue;
    const correct = m[1].toLowerCase() === 'x';
    const parts = m[2].split(/\s+(?:—|--|\|)\s+/);
    options.push({
      title: parts[0].trim(),
      detail: parts[1]?.trim() || undefined,
      correct,
    });
  }
  return options;
}

/**
 * Văn xuôi đứng TRƯỚC danh sách đầu tiên — câu hỏi của phần đó.
 * Dừng ở mọi mục danh sách, không chỉ ô tick: phần "Phân loại" và "Tự giải
 * thích" dùng gạch đầu dòng thường, nếu không dừng thì cả bảng đáp án bị nuốt
 * vào câu hỏi.
 */
function questionBefore(lines: string[]): string {
  const out: string[] = [];
  let fenced = false;
  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const t = line.trim();
    if (/^([-*]\s|\d+\.\s)/.test(t)) break;
    if (!t || t.startsWith('#')) continue;
    out.push(t);
  }
  return out.join(' ').trim();
}

function indent(line: string): number {
  return line.length - line.trimStart().length;
}

/**
 * Bắt mã Python ĐÃ MẤT THỤT LỀ.
 *
 * VÌ SAO LÀ LỖI CHỨ KHÔNG PHẢI CẢNH BÁO: Python mất thụt lề không phải "xấu
 * mã", nó là mã KHÔNG CHẠY ĐƯỢC — học viên bấm Chạy và nhận IndentationError
 * cho một bài mà họ chưa gõ chữ nào.
 *
 * VÌ SAO PHÉP KIỂM NÀY CẦN: bóc văn bản từ PDF nuốt sạch khoảng trắng đầu
 * dòng. Đo trên chính `samples/lesson-fstring.pdf` của repo — `{{slot1}}` và
 * cả thân hàm `format_scores` đều về cột 0, mà KHÔNG có ký tự nào hỏng để ai
 * đó nhìn thấy: file parse xong trông bình thường, qua `validateStudioLesson`
 * (nó không hề đọc nội dung mã), vào DB, rồi hỏng ở tay học viên.
 *
 * Luật: một dòng kết thúc bằng `:` phải có dòng KHÔNG RỖNG kế tiếp thụt sâu
 * hơn. Bỏ qua dòng chú thích (`# Kết quả:` kết thúc bằng dấu hai chấm mà không
 * mở khối nào).
 */
function kiemThutLe(code: string, at: string, loi: string[]): void {
  const lines = code.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const cur = lines[i];
    const t = cur.trim();
    if (!t || t.startsWith('#') || !t.endsWith(':')) continue;
    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    if (j >= lines.length) continue;
    if (indent(lines[j]) > indent(cur)) continue;
    loi.push(
      `${at}: mã Python MẤT THỤT LỀ — dòng "${t}" mở một khối nhưng dòng sau ` +
        `nó không thụt vào. Đây là dấu hiệu quen thuộc của văn bản bóc từ PDF; ` +
        `hãy nhập bản Markdown gốc (xem ${FORMAT_DOC}).`,
    );
    return;
  }
}

/** Các ô của một dòng bảng Markdown `| a | b |`. */
function oBang(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function laDongKe(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

/**
 * Dựng các khối của MỘT màn đọc.
 *
 * Đây là chỗ duy nhất viết ra chuỗi `type` của khối đọc — xem chú thích của
 * `READ_BLOCK_TYPES_EMITTED` về việc vì sao điều đó quan trọng.
 */
function khoiDoc(
  lines: string[],
  at: string,
  loi: string[],
): ImportedReadBlock[] {
  const out: ImportedReadBlock[] = [];
  let doan: string[] = [];
  const xaDoan = () => {
    const text = doan.join(' ').trim();
    if (text) out.push({ type: 'paragraph', text });
    doan = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (t.startsWith('```')) {
      const lang = t.slice(3).trim().toLowerCase();
      const body: string[] = [];
      let closed = false;
      i++;
      while (i < lines.length) {
        if (lines[i].trim().startsWith('```')) {
          closed = true;
          i++;
          break;
        }
        body.push(lines[i]);
        i++;
      }
      if (!closed) {
        loi.push(`${at}: code fence \`\`\`${lang} không được đóng lại.`);
      }
      xaDoan();
      const code = body.join('\n').replace(/\s+$/, '');
      if (!code) {
        loi.push(`${at}: code fence rỗng — bỏ hẳn nó đi.`);
        continue;
      }
      if (LANG_OUTPUT.has(lang)) {
        const truoc = out[out.length - 1];
        if (truoc && (truoc.type === 'code' || truoc.type === 'terminal')) {
          truoc.expected = code;
        } else {
          loi.push(
            `${at}: khối \`\`\`${lang} phải đứng NGAY SAU một khối code hoặc ` +
              `terminal — nó là kết quả của khối đó.`,
          );
        }
      } else if (LANG_TERMINAL.has(lang)) {
        out.push({ type: 'terminal', code });
      } else {
        kiemThutLe(code, at, loi);
        out.push({ type: 'code', code });
      }
      continue;
    }

    if (t.startsWith('|')) {
      const raw: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        raw.push(oBang(lines[i]));
        i++;
      }
      xaDoan();
      const rows = raw.filter((r) => !laDongKe(r));
      if (rows.length < 2) {
        loi.push(
          `${at}: bảng cần một dòng tiêu đề và ít nhất một dòng dữ liệu.`,
        );
        continue;
      }
      out.push({ type: 'table', headers: rows[0], rows: rows.slice(1) });
      continue;
    }

    if (!t) {
      xaDoan();
      i++;
      continue;
    }
    if (t.startsWith('#')) {
      i++;
      continue;
    }
    doan.push(t);
    i++;
  }
  xaDoan();
  return out;
}

@Injectable()
export class LessonImportService {
  private readonly logger = new Logger(LessonImportService.name);

  // ---------- Bóc text ----------

  /**
   * Đọc toạ độ từng mẩu chữ của một file PDF.
   *
   * NHÁNH NÀY KHÔNG CHẠY ĐƯỢC DƯỚI JEST, và đó là lý do nó chỉ làm đúng một
   * việc: lấy số liệu ra. Mọi phép suy luận nằm ở `dungVanBanTuToaDo()` (thuần,
   * Jest chấm được bằng toạ độ thật chụp sẵn). pdfjs `import()` động để dựng
   * "fake worker" nên vm của Jest ném
   * `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG` — đã thử cả `await import()`
   * lẫn `require()`.
   *
   * Đường nạp đi QUA `pdf-parse`, không `import('pdfjs-dist')` thẳng: pdfjs-dist
   * là phụ thuộc của pdf-parse chứ không phải của repo này, nên gọi thẳng tên
   * gói là dựa vào việc npm tình cờ nâng nó lên thư mục gốc.
   *
   * Trả `null` (không ném) khi đọc hỏng: người gọi còn một đường cũ dùng được,
   * và chính đường cũ mới là chỗ phát ra câu lỗi cho người soạn.
   */
  async docMauChuPdf(buffer: Buffer): Promise<MauChu[][] | null> {
    type ItemPdfjs = {
      str?: unknown;
      transform?: unknown;
      width?: unknown;
      height?: unknown;
      fontName?: unknown;
    };
    type TrangPdfjs = {
      getTextContent(): Promise<{ items: ItemPdfjs[] }>;
      cleanup(): void;
    };
    type TaiLieuPdfjs = {
      numPages: number;
      getPage(n: number): Promise<TrangPdfjs>;
      destroy(): Promise<void>;
    };
    type ModulePdfjs = {
      getDocument(src: { data: Uint8Array; verbosity?: number }): {
        promise: Promise<TaiLieuPdfjs>;
      };
    };

    try {
      // `resolve('pdf-parse')` chứ không `'pdf-parse/package.json'`: gói này
      // khai `exports` nên subpath `./package.json` KHÔNG mở ra ngoài (đã thử,
      // ném "is not defined by exports").
      const napTuPdfParse = createRequire(napCJS.resolve('pdf-parse'));
      const duongDan = napTuPdfParse.resolve('pdfjs-dist/legacy/build/pdf.mjs');
      const pdfjs = (await import(pathToFileURL(duongDan).href)) as ModulePdfjs;

      // `verbosity: 0` — pdfjs in cảnh báo font ra stdout, và đường nhập này
      // chạy trong một script mà mọi dòng in ra đều là thứ người soạn phải đọc.
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer),
        verbosity: 0,
      }).promise;
      try {
        const trangs: MauChu[][] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const trang = await doc.getPage(i);
          const { items } = await trang.getTextContent();
          const mau: MauChu[] = [];
          for (const it of items) {
            const chu = it.str;
            const t = it.transform;
            if (typeof chu !== 'string' || chu === '' || !Array.isArray(t))
              continue;
            const so = (v: unknown): number =>
              typeof v === 'number' && Number.isFinite(v) ? v : 0;
            mau.push({
              x: so(t[4]),
              y: so(t[5]),
              cao: Math.abs(so(t[3])) || so(it.height),
              rong: so(it.width),
              font: typeof it.fontName === 'string' ? it.fontName : '?',
              chu,
            });
          }
          trangs.push(mau);
          trang.cleanup();
        }
        return trangs;
      } finally {
        await doc.destroy();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Không đọc được toạ độ chữ của PDF: ${msg}`);
      return null;
    }
  }

  async extractText(file: {
    originalname: string;
    buffer: Buffer;
    mimetype?: string;
  }): Promise<string> {
    const name = (file.originalname || '').toLowerCase();
    if (
      name.endsWith('.md') ||
      name.endsWith('.markdown') ||
      name.endsWith('.txt')
    ) {
      return file.buffer.toString('utf8');
    }
    if (name.endsWith('.pdf')) {
      // ĐƯỜNG MỚI: dựng lại văn bản từ TOẠ ĐỘ chữ, giữ được thụt lề. Chỉ dùng
      // khi đo được một lưới chữ ĐỀU BỀ — xem `dungVanBanTuToaDo`. Không đo
      // được thì rơi về đúng đường cũ bên dưới, tức hành vi cũ nguyên vẹn (và
      // `kiemThutLe()` vẫn từ chối file như trước), chứ không đoán bừa.
      const mauChu = await this.docMauChuPdf(file.buffer);
      if (mauChu) {
        const theoToaDo = dungVanBanTuToaDo(mauChu);
        this.logger.log(`PDF "${file.originalname}": ${theoToaDo.doDuoc}`);
        if (theoToaDo.deuBe && theoToaDo.text.trim()) {
          return bocRacPdf(rutLeKhoiMa(theoToaDo.text));
        }
        this.logger.warn(
          `PDF "${file.originalname}": không đo được lưới chữ đều bề — ` +
            'quay về bản bóc phẳng của pdf-parse, thụt lề sẽ mất.',
        );
      }

      let text = '';
      try {
        // pdf-parse v2: class PDFParse, không phải hàm như v1. Buffer được tự
        // chuyển sang Uint8Array. destroy() để giải phóng worker của pdf.js.
        const { PDFParse } = napCJS('pdf-parse') as typeof import('pdf-parse');
        const parser = new PDFParse({ data: file.buffer });
        try {
          text = (await parser.getText()).text ?? '';
        } finally {
          await parser.destroy();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Đọc PDF thất bại: ${msg}`);
        throw new BadRequestException(
          'Không đọc được file PDF. File có thể hỏng hoặc được bảo vệ bằng mật khẩu.',
        );
      }
      if (!text.trim()) {
        // PDF scan chỉ chứa ảnh: nói thẳng thay vì đoán bừa.
        throw new BadRequestException(
          'PDF này không có lớp văn bản (có thể là bản scan). Hãy dùng file Markdown, ' +
            'hoặc PDF xuất từ trình soạn thảo. Hệ thống không chạy OCR.',
        );
      }
      return bocRacPdf(text);
    }
    throw new BadRequestException('Chỉ nhận file .md, .txt hoặc .pdf');
  }

  // ---------- Parser template ----------

  /**
   * Parse theo quy ước heading `## S1..S4` (+ `## Đọc` tuỳ chọn).
   *
   * `importedAt` nhận từ ngoài được là CÓ CHỦ ĐÍCH: `new Date()` làm dấu vân
   * tay nội dung đổi sau mỗi lần chạy, nên bản XEM TRƯỚC và bản GHI THẬT của
   * cùng một file lại khác sha256, và nhập lại một file KHÔNG ĐỔI vẫn hiện là
   * "ĐỔI". `scripts/import-lesson.ts` truyền mtime của chính file nguồn vào
   * đây để hai lần chạy trên một file cho ra đúng một dấu vân tay.
   */
  parseTemplate(
    text: string,
    filename: string,
    importedAt: string = new Date().toISOString(),
  ): ParseOutcome {
    const loi: string[] = [];
    const canhBao: string[] = [];
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const sections = splitByHeading(lines, '##');

    const stepSections = sections.filter((b) => /^S[1-4]\b/i.test(b.heading));
    const readSections = sections.filter((b) =>
      /^(đọc|doc|read)\b/i.test(b.heading),
    );
    // `## S5`, `## S0`: người soạn tưởng đã khai một bước, thực tế phần đó bị
    // bỏ im lặng. Nói ra.
    for (const b of sections) {
      if (/^S\d/i.test(b.heading) && !/^S[1-4]\b/i.test(b.heading)) {
        loi.push(
          `Heading "## ${b.heading}": chỉ có S1, S2, S3, S4. Xem ${FORMAT_DOC}.`,
        );
      }
    }
    if (!stepSections.length && !readSections.length) {
      loi.push(
        'Không tìm thấy phần nào theo mẫu: cần ít nhất một heading `## S1` … ' +
          `\`## S4\` hoặc \`## Đọc\`. Xem ${FORMAT_DOC}.`,
      );
      return { lesson: null, errors: loi, warnings: canhBao };
    }

    // PDF: cảnh báo CHUNG, luôn luôn, kể cả khi parse sạch.
    //
    // Thụt lề nay khôi phục được từ toạ độ chữ (`dungVanBanTuToaDo`), nhưng
    // việc NGẮT DÒNG THEO BỀ RỘNG TRANG thì toạ độ KHÔNG chữa được: dòng tiếp
    // theo của một dòng bị cắt nằm ở đúng cột 0 như một dòng mới thật, không
    // dấu hiệu nào phân biệt. Đo trên samples/lesson-fstring.pdf — dòng phân
    // loại `… :: `f"{x}"`, `f"{x:.2f}"`, `f"{x!r}"`` bị cắt làm hai ở giữa thẻ
    // thứ ba, nên thẻ đó vào bài thành `f"` và phần còn lại rụng mất. Không lỗi
    // nào được ném, bài vẫn qua mọi phép kiểm — chỉ là một thẻ kéo-thả vô
    // nghĩa trên màn hình học viên.
    if (filename.toLowerCase().endsWith('.pdf')) {
      canhBao.push(
        'Nguồn là PDF: thụt lề đã được dựng lại từ toạ độ chữ, nhưng việc ngắt ' +
          'dòng theo BỀ RỘNG TRANG thì không chữa được — một dòng dài (phân ' +
          'loại, rubric, bảng Test) có thể đã bị cắt làm hai mà không lỗi nào ' +
          'được ném. Hãy đọc lại bản xem trước từng dòng, hoặc dùng bản ' +
          `Markdown gốc. Xem ${FORMAT_DOC}.`,
      );
    }

    const title = tieuDe(lines);
    if (!title) {
      loi.push(
        `Thiếu dòng tiêu đề \`# <tên bài học>\` ở đầu file. Xem ${FORMAT_DOC}.`,
      );
    }

    const lesson: StudioLesson = {
      schema: STUDIO_LESSON_SCHEMA,
      title: title ?? undefined,
      source: {
        kind: filename.toLowerCase().endsWith('.pdf') ? 'pdf' : 'markdown',
        filename,
        parser: 'template',
        importedAt,
      },
    };

    // ----- Màn đọc -----
    if (readSections.length) {
      const read: ImportedReadBlock[][] = [];
      for (const section of readSections) {
        const subs = splitByHeading(section.body, '###');
        // Không có `###` nào ⇒ cả phần là MỘT màn. Có thì mỗi `###` một màn,
        // đúng hợp đồng `step_1.read: ReadBlock[][]` (mảng các MÀN).
        for (const sub of subs) {
          const at = `## ${section.heading}${sub.heading ? ` / ### ${sub.heading}` : ''}`;
          const blocks = khoiDoc(sub.body, at, loi);
          if (blocks.length) read.push(blocks);
          else if (sub.heading) canhBao.push(`${at}: màn rỗng, đã bỏ qua.`);
        }
      }
      if (!read.length) {
        loi.push(
          `Phần \`## ${readSections[0].heading}\` không có nội dung nào đọc được.`,
        );
      } else {
        lesson.step_1 = { read };
      }
    }

    const daThay = new Set<string>();
    for (const section of stepSections) {
      const n = Number(/^S([1-4])/i.exec(section.heading)![1]);
      const key = `step_${n}` as const;
      if (daThay.has(key)) {
        loi.push(
          `Có HAI heading \`## S${n}\` — phần sau sẽ đè lên phần trước, không ghi.`,
        );
      }
      daThay.add(key);

      const subs = splitByHeading(section.body, '###');
      const intro = subs.find((b) => !b.heading)?.body ?? [];
      const dung = new Set<string>();
      const sub = (re: RegExp) => {
        const hit = subs.find((b) => b.heading && re.test(b.heading));
        if (hit) dung.add(hit.heading);
        return hit?.body;
      };
      const at = `## S${n}`;

      if (n === 1) {
        // `## Đọc` và `## S1` cùng ghi vào step_1 — gộp, không đè.
        lesson.step_1 = {
          ...lesson.step_1,
          ...this.buildStep1(intro, sub, at, loi),
        };
      }
      if (n === 2) lesson.step_2 = this.buildStep2(intro, sub, at, loi);
      if (n === 3) lesson.step_3 = this.buildStep3(intro, sub, at, loi);
      if (n === 4) lesson.step_4 = this.buildStep4(intro, sub, at, loi);

      // Heading con lạ bị BỎ IM LẶNG là hình dạng lỗi chính của repo này: nội
      // dung được soạn tử tế mà không có đường tới người học. Nói ra.
      for (const b of subs) {
        if (b.heading && !dung.has(b.heading)) {
          canhBao.push(
            `${at}: không hiểu heading \`### ${b.heading}\` — phần này KHÔNG được đưa vào bài.`,
          );
        }
      }
    }

    // Cửa cuối: hợp đồng của hàm này là "errors rỗng ⇒ lesson qua được
    // validateStudioLesson". Không gộp phép kiểm đó vào đây là để bộ parse tự
    // phát ra một bài mà đường nạp sẽ từ chối, và người soạn chỉ biết điều đó
    // ở bước cuối cùng.
    loi.push(...validateStudioLesson(lesson));

    return { lesson, errors: loi, warnings: canhBao };
  }

  private buildStep1(
    intro: string[],
    sub: (re: RegExp) => string[] | undefined,
    at: string,
    loi: string[],
  ): Record<string, unknown> {
    const step: Record<string, unknown> = {};
    const body = prose(intro);
    if (body) step.context = { title: 'Ngữ cảnh', body };

    const code = firstFence(intro, 'python');
    if (code) {
      kiemThutLe(code, `${at} (code minh hoạ)`, loi);
      step.code = { filename: 'example.py', source: code };
    }

    const predictBody = sub(/dự đoán|du doan|predict/i);
    if (predictBody) {
      const options = parseOptions(predictBody);
      kiemLuaChon(options, `${at} / ### Dự đoán`, loi);
      if (options.length >= 2) {
        step.predict = {
          question: questionBefore(predictBody),
          options: options.map((o, i) => ({
            id: String.fromCharCode(97 + i),
            title: o.title,
            detail: o.detail,
            correct: o.correct,
          })),
        };
      }
    }

    const explainBody = sub(/giải thích|giai thich|explain/i);
    if (explainBody) {
      const rows: { n: number; title?: string; body: string }[] = [];
      for (const line of explainBody) {
        const m = /^\s*(\d+)\.\s*(?:\*\*(.+?)\*\*\s*[:：]?\s*)?(.+)$/.exec(
          line,
        );
        if (m) rows.push({ n: Number(m[1]), title: m[2], body: m[3].trim() });
      }
      if (rows.length) step.explain = rows;
      else
        loi.push(
          `${at} / ### Giải thích: không có dòng nào dạng \`1. **Dòng 3**: …\`.`,
        );
    }

    const missBody = sub(/ngộ nhận|ngo nhan|misconception/i);
    if (missBody) {
      // Dòng **In đậm** đứng riêng là tiêu đề; bỏ nó khỏi phần thân để không
      // hiện hai lần trên màn hình.
      const isTitle = (l: string) => /^\s*\*\*(.+?)\*\*\s*$/.test(l.trim());
      const title = missBody
        .map((l) => /^\s*\*\*(.+?)\*\*\s*$/.exec(l.trim())?.[1])
        .find(Boolean);
      const text = prose(missBody.filter((l) => !isTitle(l)));
      if (text) step.misconception = { title, body: text };
      else
        loi.push(
          `${at} / ### Ngộ nhận: thiếu phần giải thích vì sao câu đó sai ` +
            '(màn này dựng theo `body`, chỉ có tiêu đề thì nó trống).',
        );
    }

    // Sơ đồ Stack/Heap không suy ra được từ văn xuôi — nhận qua fence ```json.
    const memBody = sub(/bộ nhớ|bo nho|memory/i);
    if (memBody) {
      const raw = firstFence(memBody, 'json');
      if (!raw) {
        loi.push(`${at} / ### Bộ nhớ: thiếu khối \`\`\`json mô tả stack/heap.`);
      } else {
        try {
          step.memory = JSON.parse(raw);
        } catch (err) {
          // Bản đầu nuốt lỗi này — JSON hỏng thì màn Bộ nhớ biến mất mà không
          // ai biết. Đó đúng là kiểu hỏng im lặng mà bộ parse này phải chặn.
          loi.push(
            `${at} / ### Bộ nhớ: JSON không đọc được (${(err as Error).message}).`,
          );
        }
      }
    }
    return step;
  }

  private buildStep2(
    intro: string[],
    sub: (re: RegExp) => string[] | undefined,
    at: string,
    loi: string[],
  ): Record<string, unknown> {
    const step: Record<string, unknown> = {};

    const quizBody = sub(/trắc nghiệm|trac nghiem|quiz|mcq/i) ?? intro;
    const options = parseOptions(quizBody);
    if (options.length) {
      kiemLuaChon(options, `${at} (trắc nghiệm)`, loi);
      const correct = options.findIndex((o) => o.correct);
      const mcq: Mcq = {
        question: questionBefore(quizBody),
        options: options.map((o) => ({
          text: o.title,
          detail: o.detail,
          correct: o.correct,
        })),
        correct: correct >= 0 ? correct : undefined,
      };
      step.mcq = [mcq];
    }

    const classifyBody = sub(/phân loại|phan loai|classify/i);
    if (classifyBody) {
      const bins: Record<string, unknown>[] = [];
      const tokens: { label: string; bin: string }[] = [];
      for (const line of classifyBody) {
        const m = /^\s*[-*]\s*(.+?)::(.+)$/.exec(line);
        if (!m) continue;
        const head = m[1].split('|').map((x) => x.trim());
        const key = head[0];
        if (!key) continue;
        bins.push({
          key,
          title: head[1] || key,
          subtitle: head[2],
          desc: head[3],
        });
        for (const token of m[2].split(',')) {
          const label = stripTicks(token);
          if (label) tokens.push({ label, bin: key });
        }
      }
      if (bins.length >= 2 && tokens.length) {
        step.classify = {
          instruction: questionBefore(classifyBody) || undefined,
          bins,
          tokens,
        };
      } else {
        loi.push(
          `${at} / ### Phân loại: cần ít nhất 2 dòng \`- key | Tên :: thẻ, thẻ\` ` +
            `(đọc được ${bins.length} nhóm, ${tokens.length} thẻ).`,
        );
      }
    }

    const explainBody = sub(/tự giải thích|tu giai thich|self/i);
    if (explainBody) {
      const rubric: { label: string; keywords: string[] }[] = [];
      for (const line of explainBody) {
        const m = /^\s*[-*]\s*(.+?)::(.+)$/.exec(line);
        if (!m) continue;
        rubric.push({
          label: m[1].trim(),
          keywords: m[2]
            .split(',')
            .map((k) => stripTicks(k))
            .filter(Boolean),
        });
      }
      const prompt = questionBefore(explainBody);
      if (prompt) step.selfExplain = { prompt, rubric };
      else
        loi.push(
          `${at} / ### Tự giải thích: thiếu câu hỏi (dòng văn xuôi đứng trước danh sách).`,
        );
    }
    return step;
  }

  private buildStep3(
    intro: string[],
    sub: (re: RegExp) => string[] | undefined,
    at: string,
    loi: string[],
  ): Record<string, unknown> {
    const step: Record<string, unknown> = {};
    const body = prose(intro);
    if (body) step.task = { title: 'Nhiệm vụ', body };

    const template = firstFence(intro, 'python');
    if (template && /\{\{\s*slot\d+\s*\}\}/.test(template)) {
      kiemThutLe(template, `${at} (khung lắp ghép)`, loi);
      const slots: { n: number; placeholder?: string; answer: string }[] = [];
      const bank: { label: string; slot: number; trap?: string }[] = [];
      for (const line of intro) {
        const slot = /^\s*[-*]\s*slot(\d+)\s*=\s*(.+)$/i.exec(line);
        if (slot) {
          const answer = stripTicks(slot[2]);
          slots.push({
            n: Number(slot[1]),
            placeholder: `[Slot ${slot[1]}]`,
            answer,
          });
          bank.push({ label: answer, slot: Number(slot[1]) });
          continue;
        }
        const extra = /^\s*[-*]\s*bank(\d+)\s*=\s*(.+)$/i.exec(line);
        if (extra) {
          const trap = /\(([^)]+)\)\s*$/.exec(extra[2])?.[1];
          const label = stripTicks(extra[2].replace(/\(([^)]+)\)\s*$/, ''));
          if (label) bank.push({ label, slot: Number(extra[1]), trap });
        }
      }
      // Chỗ trống KHÔNG CÓ đáp án: `validateStudioLesson` chỉ kiểm chiều ngược
      // lại (mỗi slot khai ra phải có chỗ trong template), nên chiều này lọt —
      // và lọt thì học viên nhận một ô không bao giờ điền đúng được.
      const khaiBao = new Set(slots.map((s) => s.n));
      for (const m of template.matchAll(/\{\{\s*slot(\d+)\s*\}\}/g)) {
        const n = Number(m[1]);
        if (!khaiBao.has(n)) {
          loi.push(
            `${at}: khung có {{slot${n}}} nhưng thiếu dòng \`- slot${n} = …\`.`,
          );
        }
      }
      if (slots.length) step.scaffold = { template, slots, bank };
    } else if (template) {
      loi.push(
        `${at}: khung lắp ghép phải có ít nhất một chỗ trống \`{{slot1}}\`. Xem ${FORMAT_DOC}.`,
      );
    }

    const counterBody = sub(/dự đoán|du doan|counter|kết quả|ket qua/i);
    if (counterBody) {
      let thay = false;
      for (const line of counterBody) {
        const m = /^(.*?)\[([^\]]+)\]\s*$/.exec(line.trim());
        if (!m) continue;
        const options = m[2].split('|').map((x) => x.trim());
        const correct = options
          .find((x) => x.startsWith('*'))
          ?.slice(1)
          .trim();
        if (options.length >= 2 && correct) {
          step.counter = {
            question: m[1].trim(),
            options: options.map((x) => x.replace(/^\*/, '').trim()),
            correct,
          };
          thay = true;
          break;
        }
      }
      if (!thay) {
        loi.push(
          `${at} / ### Dự đoán kết quả: cần một dòng dạng ` +
            '`câu hỏi? [a | *b | c]` với dấu `*` trước đáp án đúng.',
        );
      }
    }

    const traceBody = sub(/nhật ký|nhat ky|trace/i);
    if (traceBody) {
      const steps: { label?: string; text: string }[] = [];
      for (const line of traceBody) {
        const m = /^\s*[-*]\s*(?:([^:]{1,12}):\s*)?(.+)$/.exec(line);
        if (m) steps.push({ label: m[1]?.trim(), text: m[2].trim() });
      }
      if (steps.length) step.trace = { steps };
      else loi.push(`${at} / ### Nhật ký: không có dòng \`- T0: …\` nào.`);
    }
    return step;
  }

  private buildStep4(
    intro: string[],
    sub: (re: RegExp) => string[] | undefined,
    at: string,
    loi: string[],
  ): Record<string, unknown> {
    const step: Record<string, unknown> = {};
    const body = prose(intro);
    if (body) step.task = { title: 'Thử thách', body };

    const starterBody = sub(/khởi tạo|khoi tao|starter/i);
    const starter =
      firstFence(starterBody ?? [], 'python') ?? firstFence(intro, 'python');
    if (starterBody && !firstFence(starterBody, 'python')) {
      loi.push(`${at} / ### Code khởi tạo: thiếu khối \`\`\`python.`);
    }
    if (starter) {
      kiemThutLe(starter, `${at} (code khởi tạo)`, loi);
      step.starterCode = starter;
    }

    const solutionBody = sub(/lời giải|loi giai|solution/i);
    const solution = firstFence(solutionBody ?? [], 'python');
    if (solutionBody && !solution) {
      loi.push(`${at} / ### Lời giải: thiếu khối \`\`\`python.`);
    }
    if (solution) {
      kiemThutLe(solution, `${at} (lời giải)`, loi);
      step.solutionCode = solution;
    }

    const hintBody = sub(/gợi ý|goi y|hint/i);
    if (hintBody) {
      const hints: { title: string; body: string }[] = [];
      for (const line of hintBody) {
        const m = /^\s*[-*]\s*(.+?)::(.+)$/.exec(line);
        if (m) hints.push({ title: m[1].trim(), body: m[2].trim() });
      }
      if (hints.length) step.hints = hints;
      else loi.push(`${at} / ### Gợi ý: cần dòng dạng \`- Tên :: nội dung\`.`);
    }

    const testBody = sub(/test|kiểm thử|kiem thu/i);
    if (testBody) {
      const tests: { name: string; call: string; expect: string }[] = [];
      for (const line of testBody) {
        const t = line.trim();
        if (!t.startsWith('|')) continue;
        const cells = oBang(t);
        if (cells.length < 2) continue;
        // Bỏ dòng tiêu đề và dòng kẻ ngang của bảng Markdown.
        if (laDongKe(cells)) continue;
        if (/^call$/i.test(cells[0])) continue;
        tests.push({
          name: cells[2] || cells[0],
          call: stripTicks(cells[0]),
          expect: stripTicks(cells[1]),
        });
      }
      if (tests.length) step.tests = tests;
      else
        loi.push(
          `${at} / ### Test: bảng không có dòng ca chấm nào đọc được ` +
            '(cần `| `call` | `expect` | name |`).',
        );
    }

    const forbidBody = sub(/cấm|cam|forbid/i);
    if (forbidBody) {
      const forbid = forbidBody
        .map((l) => /^\s*[-*]\s*(.+)$/.exec(l)?.[1])
        .filter((x): x is string => Boolean(x))
        .map(stripTicks);
      if (forbid.length) step.forbid = forbid;
      else loi.push(`${at} / ### Cấm: không có dòng \`- \`chuỗi\`\` nào.`);
    }
    return step;
  }

  // ---------- Điều phối ----------

  async importFile(file: {
    originalname: string;
    buffer: Buffer;
    mimetype?: string;
  }): Promise<ImportResult> {
    const text = await this.extractText(file);
    if (!text.trim()) {
      throw new BadRequestException('File rỗng.');
    }

    const { lesson, errors, warnings } = this.parseTemplate(
      text,
      file.originalname,
    );
    if (errors.length || !lesson) {
      this.logger.log(
        `Nhập "${file.originalname}" KHÔNG đạt: ${errors.length} lỗi.`,
      );
      // Trả cả bản nháp ra ngoài: người soạn thấy được phần nào ĐÃ nhận diện
      // được, nên biết lỗi nằm ở chỗ nào của file. Không có nghĩa là lưu được.
      throw new BadRequestException({
        message: `File chưa đúng mẫu nhập bài học. Sửa theo ${FORMAT_DOC} rồi nhập lại.`,
        errors,
        warnings,
        lesson,
        doc: FORMAT_DOC,
      });
    }

    return { lesson, parser: 'template', warnings };
  }
}

/** Tiêu đề `# ...` đầu tiên NGOÀI code fence. */
function tieuDe(lines: string[]): string | null {
  let fenced = false;
  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    if (/^#\s+\S/.test(line)) return line.replace(/^#\s+/, '').trim();
  }
  return null;
}

/**
 * Mỗi phần trắc nghiệm phải có ≥2 lựa chọn và ĐÚNG MỘT dấu `[x]`.
 *
 * `validateStudioLesson` bắt được "không có đáp án nào", nhưng KHÔNG bắt được
 * "đánh dấu hai đáp án": `options.some(o => o.correct)` đúng với cả hai, còn
 * `mcq.correct` thì chỉ trỏ vào cái ĐẦU TIÊN — nên học viên chọn cái thứ hai
 * (cũng mang `correct: true` trong dữ liệu) vẫn bị chấm sai.
 */
function kiemLuaChon(
  options: readonly ParsedOption[],
  at: string,
  loi: string[],
): void {
  if (options.length < 2) {
    loi.push(
      `${at}: cần ít nhất 2 lựa chọn dạng \`- [ ] A. …\` (đọc được ${options.length}).`,
    );
    return;
  }
  const dung = options.filter((o) => o.correct).length;
  if (dung === 0) loi.push(`${at}: chưa đánh dấu đáp án đúng bằng \`- [x]\`.`);
  if (dung > 1)
    loi.push(
      `${at}: có ${dung} dấu \`[x]\` — mỗi câu chỉ được đúng một đáp án.`,
    );
}

/**
 * Dọn rác trang của văn bản bóc từ PDF.
 *
 * Đo trên `samples/lesson-fstring.pdf`: chuỗi `-- 1 of 2 --` rơi vào GIỮA một
 * khối ```python, giữa thân hàm `format_scores`. Không dọn thì nó thành một
 * dòng mã, và bài học dạy người ta một dòng vô nghĩa.
 */
export function bocRacPdf(text: string): string {
  return text
    .split('\n')
    .filter((l) => !/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/i.test(l))
    .join('\n');
}
