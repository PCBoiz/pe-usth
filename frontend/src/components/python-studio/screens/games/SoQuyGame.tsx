'use client';

// Game · Sổ quỹ chung (bài T05): hai người cùng nộp tiền vào MỘT sổ quỹ.
// Người học viết thân hàm mà cả hai cùng chạy; động cơ Python
// (public/static/js/so-quy.py, chạy trong worker Pyodide) cho hai người chạy
// xen kẽ theo lịch TẤT ĐỊNH rồi trả vết từng nhịp. Màn này chỉ PHÁT LẠI vết —
// kéo thanh tua không chạy lại Python (logic nhịp → trạng thái ở
// lib/so-quy-replay.ts, có test riêng).
//
// Cốt truyện chỉ bằng hình (design/v3/quyet-dinh.md mục 1): hai nhân vật, cuốn
// sổ, cánh cửa có khoá. Không câu bối cảnh, không lời thoại — chữ duy nhất trên
// sân khấu là số và tên người.
import { useEffect, useId, useMemo, useState } from 'react';

import {
  docVet,
  kepNhip,
  moTaNhip,
  nhanLoi,
  nhanMucTieu,
  nhipDung,
  nhipKe,
  trangThaiTai,
  type SoQuyNguoiAnh,
  type SoQuyTrangThai,
  type SoQuyVet,
} from '@/lib/so-quy-replay';
import { highlightPython } from '@/lib/py-highlight';
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';

import c from '../../studio-chrome.module.css';
import { ScreenShell } from '../chrome';
import type { LessonScreenProps } from '../props';
import type { GameProps } from './common';
import s from './SoQuyGame.module.css';

type Props = GameProps<'soQuy'> &
  Pick<LessonScreenProps, 'gameRun' | 'onRunGame' | 'onStop' | 'running' | 'runtimeStatus' | 'busy'>;

/** Một nhịp mỗi 0,7 s khi phát: đủ chậm để mắt theo được bong bóng số. */
const BUOC_MS = 700;

export default function SoQuyGame({
  game,
  state,
  scr,
  metaLabel,
  verdict,
  updateGame,
  gameRun,
  onRunGame,
  onStop,
  running,
  runtimeStatus,
  busy,
}: Props) {
  const code = state.code ?? game.code;
  const vet = useMemo(() => (gameRun ? docVet(gameRun.trace) : null), [gameRun]);
  const editorId = useId();
  const mucTieu = nhanMucTieu({ mong_doi: game.soDu + game.nguoi.reduce((t, p) => t + p.soTien, 0) });

  return (
    <ScreenShell scr={scr} metaLabel={metaLabel} title={game.title} verdict={verdict}>
      <div className={s.game}>
        {/* key: vết MỚI thì bộ phát dựng lại từ đầu (về nhịp 0 hoặc nhịp hỏng),
            không mang nhịp đang xem của lần chạy trước sang. */}
        <Replay key={gameRun ? runKey(gameRun) : 'chua-chay'} vet={vet} mucTieu={mucTieu} game={game} />

        {gameRun && !vet && (
          <p className={`${c.note} ${c.noteWarn}`} role="status">
            {gameRun.error ?? 'Không đọc được kết quả chạy. Bấm Chạy lại.'}
          </p>
        )}

        <div className={s.editor}>
          <label className={s.editorLabel} htmlFor={editorId}>
            main.py
          </label>
          <textarea
            id={editorId}
            className={s.textarea}
            spellCheck={false}
            value={code}
            rows={Math.max(5, code.split('\n').length + 1)}
            disabled={busy}
            onChange={(e) => updateGame(game.id, { code: e.target.value })}
          />
          <div className={s.runRow}>
            <button
              type="button"
              className={s.runBtn}
              onClick={running ? onStop : () => onRunGame(false)}
              disabled={busy}
            >
              {running ? 'Dừng' : 'Chạy'}
            </button>
            <span className={s.runStatus} role="status">
              {running ? runtimeStatus : ''}
            </span>
            <button
              type="button"
              className={c.resetLink}
              onClick={() => updateGame(game.id, { code: game.code })}
            >
              Khôi phục code ban đầu
            </button>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}

/**
 * Khoá cho bộ phát: mỗi lượt chạy là một object RunResult mới (useCodeRunner
 * luôn tạo bản mới), nên đánh số theo danh tính object là đủ.
 */
const runKeys = new WeakMap<object, string>();
let runSeq = 0;
function runKey(run: object): string {
  let key = runKeys.get(run);
  if (!key) {
    runSeq += 1;
    key = `lan-${runSeq}`;
    runKeys.set(run, key);
  }
  return key;
}

function Replay({
  vet,
  mucTieu,
  game,
}: {
  vet: SoQuyVet | null;
  mucTieu: string;
  game: Props['game'];
}) {
  const reduced = usePrefersReducedMotion();
  // Chạy xong: tắt chuyển động thì nhảy thẳng tới nhịp hỏng (hoặc nhịp cuối),
  // không tự phát — thanh tua vẫn đi được từng nhịp bằng bàn phím.
  const [nhip, setNhip] = useState(() => (vet && reduced ? nhipDung(vet) : 0));
  const [dangPhat, setDangPhat] = useState(() => Boolean(vet && !reduced && nhipDung(vet) > 0));

  useEffect(() => {
    if (!dangPhat || !vet) return;
    const t = setTimeout(() => {
      const ke = nhipKe(vet, nhip);
      if (ke === null) {
        setDangPhat(false);
        return;
      }
      setNhip(ke);
      if (nhipKe(vet, ke) === null) setDangPhat(false);
    }, BUOC_MS);
    return () => clearTimeout(t);
  }, [dangPhat, vet, nhip]);

  if (!vet) {
    return (
      <>
        <Stage trangThai={null} vet={null} ten={game.nguoi.map((p) => p.ten)} soTien={game.nguoi.map((p) => p.soTien)} soDu={game.soDu} />
        <p className={s.goal}>
          <span className={s.goalLabel}>Mục tiêu</span> {mucTieu}
        </p>
      </>
    );
  }

  const st = trangThaiTai(vet, nhip);
  const tua = (n: number) => {
    setDangPhat(false);
    setNhip(kepNhip(vet, n));
  };
  const phat = () => {
    if (dangPhat) return setDangPhat(false);
    // Đang ở chỗ dừng (nhịp hỏng/nhịp cuối): bấm Phát là xem lại từ đầu.
    if (nhipKe(vet, nhip) === null) setNhip(0);
    setDangPhat(true);
  };

  return (
    <>
      <Stage
        trangThai={st}
        vet={vet}
        ten={vet.nguoi.map((p) => p.ten)}
        soTien={vet.nguoi.map((p) => p.so_tien)}
        soDu={vet.so_du_dau}
      />

      <p className={s.goal} role="status">
        <span className={s.goalLabel}>Mục tiêu</span> {mucTieu}
        <span className={vet.dat ? s.goalOk : s.goalBad}>
          {vet.dat ? '✓ đạt' : `✕ sổ ra ${vet.so_du}`}
        </span>
      </p>

      <div className={s.scrub} role="group" aria-label="Phát lại">
        <button type="button" className={s.iconBtn} onClick={() => tua(nhip - 1)} disabled={nhip === 0}>
          <span aria-hidden="true">‹</span>
          <span className={s.srOnly}>Nhịp trước</span>
        </button>
        <button type="button" className={s.playBtn} onClick={phat} disabled={st.tong === 0}>
          {dangPhat ? 'Dừng' : 'Phát'}
        </button>
        <button type="button" className={s.iconBtn} onClick={() => tua(nhip + 1)} disabled={nhip >= st.tong}>
          <span aria-hidden="true">›</span>
          <span className={s.srOnly}>Nhịp sau</span>
        </button>
        <input
          type="range"
          className={s.range}
          min={0}
          max={st.tong}
          step={1}
          value={nhip}
          aria-label="Nhịp"
          aria-valuetext={moTaNhip(vet, nhip)}
          onChange={(e) => tua(Number(e.target.value))}
          disabled={st.tong === 0}
        />
        <span className={s.counter}>
          Nhịp {nhip}/{st.tong}
        </span>
      </div>

      <Lich vet={vet} nhip={nhip} />

      <div className={s.panels}>
        <MaVet vet={vet} st={st} />
        <BangBien vet={vet} st={st} />
      </div>

      {vet.in_ra && (
        <pre className={s.inRa} aria-label="In ra">
          {vet.in_ra}
        </pre>
      )}
    </>
  );
}

/** Ô đứng của nhân vật: ngoài cửa (chưa vào), sát cửa (đang chờ khoá), bên bàn. */
function viTri(i: number, p: SoQuyNguoiAnh): string {
  if (p.o === 'chua') return i === 0 ? s.oNgoai0 : s.oNgoai1;
  if (p.o === 'cho') return s.oCua;
  return i === 0 ? s.oBan0 : s.oBan1;
}

function Stage({
  trangThai,
  vet,
  ten,
  soTien,
  soDu,
}: {
  trangThai: SoQuyTrangThai | null;
  vet: SoQuyVet | null;
  ten: string[];
  soTien: number[];
  soDu: number;
}) {
  const st = trangThai;
  const nguoi = st?.nguoi ?? ten.map(() => ({ o: 'chua' as const, dong: null, cam: null, bien: {} }));
  const khoaDong = st?.khoa != null;
  const suKien = st?.suKien ?? null;
  // Số bị ghi đè: nhịp ghi thì hiện số TRƯỚC đó gạch ngang, ngay trên số mới.
  const truoc = suKien?.viec === 'ghi' && vet ? trangThaiTai(vet, (st?.nhip ?? 1) - 1).so_du : null;
  const hong = Boolean(st?.loi && suKien && st.loi.nhip === suKien.n && st.loi.loai === 'ghi_de');

  return (
    <svg className={s.stage} viewBox="0 0 600 240" role="img" aria-label={vet && st ? moTaNhip(vet, st.nhip) : `Sổ quỹ ${soDu}`}>
      <line className={s.floor} x1="0" y1="212" x2="600" y2="212" />
      {/* Phòng: tường trái có ô cửa ở dưới. */}
      <path className={s.wall} d="M190 212 V30 H590 V212 M190 30 V110" />
      {khoaDong ? (
        <g>
          <rect className={s.door} x="184" y="110" width="12" height="102" rx="2" />
          <g className={s.lock} transform="translate(178 150)">
            <path className={s.shackle} d="M4 0 V-7 a8 8 0 0 1 16 0 V0" />
            <rect className={s.lockBody} x="0" y="0" width="24" height="18" rx="3" />
          </g>
        </g>
      ) : (
        <g>
          <path className={s.door} d="M196 110 L222 120 V222 L196 212 Z" />
          <g className={s.lock} transform="translate(206 150)">
            <path className={s.shackle} d="M4 0 V-7 a8 8 0 0 1 16 0 V-12" />
            <rect className={s.lockBody} x="0" y="0" width="24" height="18" rx="3" />
          </g>
        </g>
      )}

      {/* Bàn và cuốn sổ. */}
      <rect className={s.desk} x="330" y="150" width="120" height="10" rx="3" />
      <rect className={hong ? `${s.book} ${s.bookHong}` : s.book} x="340" y="88" width="100" height="62" rx="6" />
      <line className={s.spine} x1="390" y1="92" x2="390" y2="146" />
      {truoc !== null && truoc !== st?.so_du && (
        <text className={s.oldNum} x="390" y="80" textAnchor="middle">
          {truoc}
        </text>
      )}
      <text className={s.bookNum} x="390" y="128" textAnchor="middle">
        {st?.so_du ?? soDu}
      </text>

      {nguoi.slice(0, 2).map((p, i) => {
        const lop = [s.nguoi, viTri(i, p), i === 0 ? s.nguoiA : s.nguoiB];
        if (suKien?.ai === i) lop.push(s.dangLam);
        if (p.o === 'xong') lop.push(s.xong);
        return (
          <g key={i} className={lop.join(' ')}>
            <circle className={s.head} cx="0" cy="-62" r="13" />
            <rect className={s.body} x="-16" y="-46" width="32" height="44" rx="10" />
            <text className={s.name} x="0" y="20" textAnchor="middle">
              {ten[i]} +{soTien[i]}
            </text>
            {p.cam !== null && (
              <g>
                <rect className={s.bubble} x="-26" y="-112" width="52" height="28" rx="8" />
                <text className={s.bubbleNum} x="0" y="-92" textAnchor="middle">
                  {p.cam}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Dải lịch: mỗi nhịp một ô mang tên người làm — thấy ngay ai chen vào lúc nào. */
function Lich({ vet, nhip }: { vet: SoQuyVet; nhip: number }) {
  const moc = vet.loi ? Math.min(vet.loi.nhip, vet.nhip.length) : null;
  return (
    <ol className={s.lich} aria-hidden="true">
      {vet.nhip.map((x) => {
        const lop = [s.lichO, x.ai === 0 ? s.lichA : s.lichB];
        if (x.viec === 'cho') lop.push(s.lichCho);
        if (x.n === nhip) lop.push(s.lichDang);
        if (x.n === moc) lop.push(s.lichHong);
        return (
          <li key={x.n} className={lop.join(' ')}>
            {vet.nguoi[x.ai]?.ten}
          </li>
        );
      })}
    </ol>
  );
}

/** Code đã sinh ra vết, với mốc người đang đứng ở dòng nào và hộp lỗi cạnh dòng hỏng. */
function MaVet({ vet, st }: { vet: SoQuyVet; st: SoQuyTrangThai }) {
  const dong = vet.ma.replace(/\s+$/, '').split('\n');
  const dongSuKien = st.suKien?.dong ?? null;
  return (
    <div className={s.code}>
      {dong.map((text, i) => {
        const so = i + 1;
        const moc = st.nguoi
          .map((p, k) => ({ p, k }))
          .filter(({ p }) => (p.o === 'chay' || p.o === 'cho') && p.dong === so);
        return (
          <div key={so}>
            <div className={so === dongSuKien ? `${s.codeLine} ${s.codeLineOn}` : s.codeLine}>
              <span className={s.lineNo}>{so}</span>
              <span className={s.marks}>
                {moc.map(({ k }) => (
                  <span key={k} className={k === 0 ? s.markA : s.markB}>
                    {vet.nguoi[k]?.ten}
                  </span>
                ))}
              </span>
              <code className={s.codeText}>{highlightPython(text)}</code>
            </div>
            {st.loi && st.loi.dong === so && <HopLoi vet={vet} st={st} />}
          </div>
        );
      })}
      {st.loi && (st.loi.dong === null || st.loi.dong > dong.length) && <HopLoi vet={vet} st={st} />}
    </div>
  );
}

function HopLoi({ st }: { vet: SoQuyVet; st: SoQuyTrangThai }) {
  if (!st.loi) return null;
  const nhan = nhanLoi(st.loi);
  return (
    <p className={s.hopLoi}>
      {nhan && <strong className={s.hopLoiNhan}>{nhan}</strong>} {st.loi.cau}
    </p>
  );
}

function BangBien({ vet, st }: { vet: SoQuyVet; st: SoQuyTrangThai }) {
  const ten = Array.from(new Set(st.nguoi.flatMap((p) => Object.keys(p.bien)))).sort();
  return (
    <table className={s.vars}>
      <caption className={s.srOnly}>Biến của từng người ở nhịp {st.nhip}</caption>
      <thead>
        <tr>
          <th scope="col">Biến</th>
          {vet.nguoi.map((p) => (
            <th key={p.ten} scope="col">
              {p.ten}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">dòng</th>
          {st.nguoi.map((p, i) => (
            <td key={i}>{p.o === 'xong' ? 'xong' : (p.dong ?? '—')}</td>
          ))}
        </tr>
        {ten.map((bien) => (
          <tr key={bien}>
            <th scope="row">
              <code>{bien}</code>
            </th>
            {st.nguoi.map((p, i) => (
              <td key={i}>{p.bien[bien] ?? '—'}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
