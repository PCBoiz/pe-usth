/**
 * Phát lại vết của mini-game "Sổ quỹ chung" (bài T05): nhịp → trạng thái.
 *
 * Vết do động cơ Python sinh ra (`public/static/js/so-quy.py`, chạy trong worker
 * Pyodide). Phía React CHỈ đọc vết: kéo thanh tua tới nhịp nào thì hiện trạng
 * thái ghi sẵn của nhịp đó, không chạy lại Python. Nhờ vậy tua tới lui bao
 * nhiêu lần cũng ra đúng một hình, và tua được cả khi worker đã bị giết.
 *
 * Giữ file THUẦN (không import gì, không JSX) để `node --test` nạp thẳng
 * (`e2e/unit/so-quy-replay.test.mjs`).
 *
 * VÌ SAO CÓ `docVet()` KIỂM KỸ: vết đi qua postMessage từ một worker mà phía
 * React không kiểm soát nội dung (code người học chạy trong đó). Một trường
 * thiếu mà component chấm thẳng `.nguoi[1].bien` là màn trắng không log —
 * đúng kiểu lỗi `screen-kinds.ts` sinh ra để chặn. Vết sai hình thì trả `null`
 * và màn hiện câu báo hỏng.
 */

export type SoQuyViec = 'doc' | 'ghi' | 'lay' | 'cho' | 'tra';
/** Số giữ nguyên là số; giá trị khác là repr ngắn do Python dựng. */
export type SoQuyGiaTri = number | string;
export type SoQuyO = 'chua' | 'chay' | 'cho' | 'xong';

export type SoQuyNguoiAnh = {
  o: SoQuyO;
  /** Dòng của thao tác dùng chung người này sắp làm (hoặc vừa làm nếu đã xong). */
  dong: number | null;
  /** Số đọc được gần nhất — "bong bóng" trên đầu nhân vật. */
  cam: SoQuyGiaTri | null;
  bien: Record<string, SoQuyGiaTri>;
};

export type SoQuyNhip = {
  n: number;
  ai: number;
  viec: SoQuyViec;
  dong: number | null;
  gia_tri: SoQuyGiaTri | null;
  so_du: SoQuyGiaTri;
  /** Chỉ số người đang giữ khoá. */
  khoa: number | null;
  nguoi: SoQuyNguoiAnh[];
};

export type SoQuyLoi = {
  loai: string;
  /** 0 = hỏng trước nhịp đầu (lỗi cú pháp, thiếu hàm). */
  nhip: number;
  dong: number | null;
  ai: number | null;
  cau: string;
};

export type SoQuyVet = {
  phien_ban: 1;
  nguoi: { ten: string; so_tien: number }[];
  so_du_dau: number;
  mong_doi: number;
  nhip: SoQuyNhip[];
  so_du: SoQuyGiaTri;
  dat: boolean;
  loi: SoQuyLoi | null;
  lich: { kieu: 'luan-phien' | 'chen'; chen: number[] };
  so_lich_da_do: number;
  in_ra: string;
  /** Đúng đoạn code đã sinh ra vết này (ô soạn có thể đã đổi từ lúc chạy). */
  ma: string;
};

export type SoQuyTrangThai = {
  /** Nhịp đang xem, 0 = trước khi ai làm gì. */
  nhip: number;
  tong: number;
  so_du: SoQuyGiaTri;
  khoa: number | null;
  nguoi: SoQuyNguoiAnh[];
  /** Việc vừa xảy ra ở nhịp này (null ở nhịp 0). */
  suKien: SoQuyNhip | null;
  /** Lỗi đã xảy ra TỚI nhịp đang xem — tua về trước nhịp hỏng thì chưa hiện. */
  loi: SoQuyLoi | null;
};

const VIEC = new Set<string>(['doc', 'ghi', 'lay', 'cho', 'tra']);
const O = new Set<string>(['chua', 'chay', 'cho', 'xong']);

function laObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function laSoNguyen(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v);
}
function laGiaTri(v: unknown): v is SoQuyGiaTri {
  return typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v));
}
function laDong(v: unknown): v is number | null {
  return v === null || (laSoNguyen(v) && v > 0);
}
function laAi(v: unknown, soNguoi: number): v is number {
  return laSoNguyen(v) && v >= 0 && v < soNguoi;
}

function docNguoiAnh(v: unknown): SoQuyNguoiAnh | null {
  if (!laObj(v) || !O.has(String(v.o)) || !laDong(v.dong)) return null;
  if (!(v.cam === null || laGiaTri(v.cam)) || !laObj(v.bien)) return null;
  const bien: Record<string, SoQuyGiaTri> = {};
  for (const [k, x] of Object.entries(v.bien)) {
    if (!laGiaTri(x)) return null;
    bien[k] = x;
  }
  return { o: v.o as SoQuyO, dong: v.dong, cam: v.cam, bien };
}

function docNhip(v: unknown, i: number, soNguoi: number): SoQuyNhip | null {
  if (!laObj(v) || v.n !== i + 1 || !laAi(v.ai, soNguoi) || !VIEC.has(String(v.viec))) return null;
  if (!laDong(v.dong) || !(v.gia_tri === null || laGiaTri(v.gia_tri)) || !laGiaTri(v.so_du)) return null;
  if (!(v.khoa === null || laAi(v.khoa, soNguoi))) return null;
  if (!Array.isArray(v.nguoi) || v.nguoi.length !== soNguoi) return null;
  const nguoi = v.nguoi.map(docNguoiAnh);
  if (nguoi.some((x) => x === null)) return null;
  return {
    n: v.n,
    ai: v.ai,
    viec: v.viec as SoQuyViec,
    dong: v.dong,
    gia_tri: v.gia_tri,
    so_du: v.so_du,
    khoa: v.khoa,
    nguoi: nguoi as SoQuyNguoiAnh[],
  };
}

function docLoi(v: unknown, soNguoi: number): SoQuyLoi | null | undefined {
  if (v === null) return null;
  if (!laObj(v) || typeof v.loai !== 'string' || typeof v.cau !== 'string') return undefined;
  if (!laSoNguyen(v.nhip) || v.nhip < 0 || !laDong(v.dong)) return undefined;
  if (!(v.ai === null || laAi(v.ai, soNguoi))) return undefined;
  return { loai: v.loai, nhip: v.nhip, dong: v.dong, ai: v.ai, cau: v.cau };
}

/** Vết từ worker → kiểu đã kiểm. Sai hình ở BẤT KỲ chỗ nào thì `null`. */
export function docVet(raw: unknown): SoQuyVet | null {
  if (!laObj(raw) || raw.phien_ban !== 1) return null;
  if (!Array.isArray(raw.nguoi) || raw.nguoi.length < 2) return null;
  const nguoi: SoQuyVet['nguoi'] = [];
  for (const p of raw.nguoi) {
    if (!laObj(p) || typeof p.ten !== 'string' || !laSoNguyen(p.so_tien)) return null;
    nguoi.push({ ten: p.ten, so_tien: p.so_tien });
  }
  if (!laSoNguyen(raw.so_du_dau) || !laSoNguyen(raw.mong_doi) || !laGiaTri(raw.so_du)) return null;
  if (typeof raw.dat !== 'boolean' || !Array.isArray(raw.nhip)) return null;
  const nhip: SoQuyNhip[] = [];
  for (let i = 0; i < raw.nhip.length; i++) {
    const x = docNhip(raw.nhip[i], i, nguoi.length);
    if (!x) return null;
    nhip.push(x);
  }
  const loi = docLoi(raw.loi, nguoi.length);
  if (loi === undefined) return null;
  // Đạt mà vẫn mang lỗi là vết tự mâu thuẫn — không tin nửa nào cả.
  if (raw.dat && loi) return null;
  const lich = laObj(raw.lich) ? raw.lich : null;
  if (!lich || (lich.kieu !== 'luan-phien' && lich.kieu !== 'chen')) return null;
  if (!Array.isArray(lich.chen) || !lich.chen.every(laSoNguyen)) return null;
  return {
    phien_ban: 1,
    nguoi,
    so_du_dau: raw.so_du_dau,
    mong_doi: raw.mong_doi,
    nhip,
    so_du: raw.so_du,
    dat: raw.dat,
    loi,
    lich: { kieu: lich.kieu, chen: lich.chen as number[] },
    so_lich_da_do: laSoNguyen(raw.so_lich_da_do) ? raw.so_lich_da_do : 0,
    in_ra: typeof raw.in_ra === 'string' ? raw.in_ra : '',
    ma: typeof raw.ma === 'string' ? raw.ma : '',
  };
}

/** Kẹp nhịp vào [0, tổng số nhịp]. NaN (ô range rỗng) về 0. */
export function kepNhip(vet: SoQuyVet, n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(Math.trunc(n), 0), vet.nhip.length);
}

/**
 * Nhịp của lỗi, kẹp vào vết. Lỗi Python xảy ra GIỮA một nhịp chưa kịp ghi
 * (nhịp = số nhịp đã ghi + 1) nên phải kẹp về nhịp cuối có thật.
 */
export function nhipCuaLoi(vet: SoQuyVet): number | null {
  if (!vet.loi) return null;
  return Math.min(vet.loi.nhip, vet.nhip.length);
}

export function trangThaiTai(vet: SoQuyVet, n: number): SoQuyTrangThai {
  const nhip = kepNhip(vet, n);
  const tong = vet.nhip.length;
  const mocLoi = nhipCuaLoi(vet);
  const loi = mocLoi !== null && nhip >= mocLoi ? vet.loi : null;
  if (nhip === 0) {
    return {
      nhip,
      tong,
      so_du: vet.so_du_dau,
      khoa: null,
      nguoi: vet.nguoi.map(() => ({ o: 'chua', dong: null, cam: null, bien: {} })),
      suKien: null,
      loi,
    };
  }
  const x = vet.nhip[nhip - 1];
  return { nhip, tong, so_du: x.so_du, khoa: x.khoa, nguoi: x.nguoi, suKien: x, loi };
}

/**
 * Chạy xong thì dừng ở đâu: nhịp hỏng nếu có (người học thấy ngay chỗ ghi
 * đè), không thì nhịp cuối.
 */
export function nhipDung(vet: SoQuyVet): number {
  return nhipCuaLoi(vet) ?? vet.nhip.length;
}

/** Nhịp kế tiếp khi đang phát; `null` = đã tới chỗ dừng, thôi phát. */
export function nhipKe(vet: SoQuyVet, n: number): number | null {
  const dung = nhipDung(vet);
  const ke = kepNhip(vet, n) + 1;
  return ke > dung ? null : ke;
}

/** "Nhịp 4 · dòng 3" — phần nào không có thì bỏ. */
export function nhanLoi(loi: SoQuyLoi): string {
  const phan: string[] = [];
  if (loi.nhip > 0) phan.push(`Nhịp ${loi.nhip}`);
  if (loi.dong !== null) phan.push(phan.length ? `dòng ${loi.dong}` : `Dòng ${loi.dong}`);
  return phan.join(' · ');
}

const DONG_TU: Record<SoQuyViec, string> = {
  doc: 'đọc sổ',
  ghi: 'ghi sổ',
  lay: 'lấy khoá',
  cho: 'đứng chờ khoá',
  tra: 'trả khoá',
};

/** Câu đọc lên cho thanh tua (aria-valuetext): ngắn, chỉ dữ kiện. */
export function moTaNhip(vet: SoQuyVet, n: number): string {
  const s = trangThaiTai(vet, n);
  const dau = `Nhịp ${s.nhip}/${s.tong}`;
  if (!s.suKien) return `${dau} · sổ quỹ ${s.so_du}`;
  const ai = vet.nguoi[s.suKien.ai]?.ten ?? '?';
  const giaTri = s.suKien.gia_tri === null ? '' : ` ${s.suKien.gia_tri}`;
  const dong = s.suKien.dong === null ? '' : ` · dòng ${s.suKien.dong}`;
  return `${dau} · ${ai} ${DONG_TU[s.suKien.viec]}${giaTri}${dong} · sổ quỹ ${s.so_du}`;
}

/** Mục tiêu của màn — một dữ kiện kiểm được, không phải lời kể. */
export function nhanMucTieu(vet: Pick<SoQuyVet, 'mong_doi'>): string {
  return `Sổ quỹ = ${vet.mong_doi}`;
}

/** Câu chấm gửi về vỏ bài học (FeedbackBanner). */
export function cauCham(vet: SoQuyVet): string {
  if (vet.dat) return `Sổ quỹ ra ${vet.so_du} · đúng ở cả ${vet.so_lich_da_do} lịch chạy xen kẽ đã thử.`;
  if (vet.loi) {
    const nhan = nhanLoi(vet.loi);
    return nhan ? `${nhan}: ${vet.loi.cau}` : vet.loi.cau;
  }
  return `Sổ quỹ ra ${vet.so_du}, cần ${vet.mong_doi}.`;
}
