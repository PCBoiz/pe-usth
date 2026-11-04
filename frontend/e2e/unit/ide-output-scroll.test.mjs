/**
 * /ide trên điện thoại: KẾT QUẢ VỪA VỀ PHẢI NẰM TRONG MÀN.
 *
 * VÌ SAO FILE NÀY TỒN TẠI: khổ < 900px xếp dọc — nút Chạy ở TRÊN, editor cao
 * 55vh, ô kết quả ở DƯỚI. Đo trên production 04/11/2026:
 *   · 390×844 có băng "Đã khôi phục…": ô kết quả ở y = 888..1108 — dưới mép màn.
 *     Chạy xong 4,9 s, ảnh chụp GIỐNG HỆT trước khi bấm;
 *   · 390×844 không băng: ô ở 759..979, thấy 85px;
 *   · 375×667: ô ở 661..881, thấy 6px.
 * /ide là đích của 406 nút "Thử ngay trong IDE" từ màn đọc.
 *
 * Các số đo trên là FIXTURE của ca dưới — không phải số bịa cho đẹp.
 *
 * ABLATION — gỡ từng mảnh rồi đếm:
 *   chỉ kéo khi ô nằm HẲN dưới màn (top > caoMan)       → 2 đỏ
 *   effect chỉ xét 'done', bỏ 'error'                   → 1 đỏ
 *   cuộn ngay trong run() lúc bấm (Dừng trôi khỏi màn)  → 1 đỏ
 *   bật cờ TRƯỚC lời return của mã-từ-link chưa xác nhận → 1 đỏ
 *   bỏ nhánh prefers-reduced-motion                     → 1 đỏ
 *   thôi gắn ref vào ô kết quả                          → 1 đỏ
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canKeoKetQua, KET_QUA_THAY_TOI_THIEU_PX } from '../../src/lib/ide-output-scroll.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const IDE = readFileSync(join(HERE, '..', '..', 'src', 'app', 'ide', 'IdeClient.tsx'), 'utf8').replace(/\r/g, '');

test('điện thoại — ba khổ ĐÃ ĐO trên production đều phải kéo ô kết quả vào màn', () => {
  assert.equal(canKeoKetQua(888, 1108, 844), true, '390×844 có băng: ô nằm hẳn dưới mép màn');
  assert.equal(canKeoKetQua(759, 979, 844), true, '390×844 không băng: thấy 85px — chưa đủ một dòng trạng thái + vài dòng in ra');
  assert.equal(canKeoKetQua(661, 881, 667), true, '375×667: thấy 6px');
});

test('KHÔNG kéo khi ô đã đủ trong màn — máy tính xếp ngang, hay người học đã tự cuộn xuống', () => {
  assert.equal(canKeoKetQua(190, 710, 900), false, 'máy tính: ô kết quả nằm cạnh editor');
  assert.equal(canKeoKetQua(400, 620, 844), false, 'đã cuộn: ô thấy trọn');
  assert.equal(canKeoKetQua(844 - KET_QUA_THAY_TOI_THIEU_PX, 1000, 844), false, 'thấy ĐÚNG bằng ngưỡng là đủ');
  assert.equal(canKeoKetQua(780, 840, 844), false, 'ô thấp hơn ngưỡng mà thấy trọn: không đòi thêm');
});

test('ô trôi lên TRÊN màn (người học cuộn quá) cũng là không thấy', () => {
  assert.equal(canKeoKetQua(-400, -20, 844), true);
});

/** Thân của useEffect chứa `canKeoKetQua(` trong IdeClient. */
function thanEffect() {
  const i = IDE.indexOf('canKeoKetQua(r.top');
  assert.ok(i > 0, 'IdeClient không còn gọi canKeoKetQua(r.top, …) — đổi cách gọi thì sửa ca này.');
  const dau = IDE.lastIndexOf('useEffect(', i);
  const cuoi = IDE.indexOf('}, [state]);', i);
  assert.ok(dau > 0 && cuoi > i, 'Lời gọi không còn nằm trong một useEffect phụ thuộc [state].');
  return IDE.slice(dau, cuoi);
}

/** Thân của `const run = useCallback(…)`. */
function thanRun() {
  const dau = IDE.indexOf('const run = useCallback(');
  assert.ok(dau > 0, 'không tìm thấy run()');
  return IDE.slice(dau, IDE.indexOf('\n  }, [', dau));
}

test('kéo khi kết quả VỀ — xong hay lỗi — và theo khung nhìn hiện tại', () => {
  const e = thanEffect();
  assert.match(e, /state\.status !== 'done' && state\.status !== 'error'/, 'effect phải kéo cả khi lỗi — câu báo lỗi cũng là kết quả người học cần đọc.');
  assert.match(e, /canKeoKetQua\(r\.top, r\.bottom, window\.innerHeight\)/);
  assert.match(e, /scrollIntoView\(\{ block: 'nearest'/, "phải cuộn ÍT NHẤT có thể ('nearest'), không giật cả trang về đầu ô.");
  assert.match(e, /prefers-reduced-motion: reduce/, 'người bật giảm chuyển động không được nhận cú cuộn mượt.');
});

test('KHÔNG cuộn lúc bấm Chạy — nút "■ Dừng" phải còn trong màn khi chương trình đang chạy', () => {
  const r = thanRun();
  assert.doesNotMatch(r, /scrollIntoView|scrollTo|scrollBy/, 'run() tự cuộn ⇒ đẩy nút Dừng ra khỏi màn đúng lúc có thể cần nó.');
  const coBat = r.indexOf('keoKetQuaRef.current = true');
  assert.ok(coBat > 0, 'run() không bật cờ kéo ô kết quả.');
  // Mã đến từ link chưa xác nhận thì run() thoát sớm, không chạy gì — bật cờ
  // trước chỗ đó là để lại cờ treo, và một lần đổi state SAU này sẽ cuộn oan.
  assert.ok(coBat > r.indexOf('if (askLinkRef.current) return;'), 'cờ được bật TRƯỚC lời return của mã-từ-link chưa xác nhận.');
});

test('ref gắn đúng vào ô kết quả', () => {
  assert.match(IDE, /<section\s+ref=\{outputRef\}\s+className=\{styles\.outputPane\}/, 'outputRef không gắn vào section .outputPane — effect đo nhầm phần tử hoặc đo null.');
});
