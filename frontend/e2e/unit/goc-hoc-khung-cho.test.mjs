/**
 * KHUNG GIỮ CHỖ CỦA TRANG CHỦ GÓC HỌC — phải trùng khung hình đầu của cảnh.
 *
 * VÌ SAO FILE NÀY TỒN TẠI: HTML máy chủ của trang chủ từng là MỘT div rỗng.
 * Trang không vẽ gì tới khi JS hydrate, lấy số (tới 3 s nếu có phiên) và
 * engine dựng xong cảnh — ảnh phòng chỉ được YÊU CẦU lúc đó. Đo trên production
 * (390×844, CPU 4×): FCP = LCP = 3 372 ms (trung vị 3 lượt), vết ghi "load
 * delay" 4 546 ms trong khi tải ảnh chỉ 48 ms.
 *
 * Khung giữ chỗ (StudyRoom.tsx + `.gh-cho` trong scene.css) đưa khung hình ĐẦU
 * của màn mở đầu ra HTML máy chủ: ảnh phòng dưới lớp tối. Nó chỉ có giá trị
 * nếu TRÙNG khung hình ấy — lệch thì lúc cảnh thật phủ lên là một cú nhảy.
 * Và vị trí ảnh là một BẢN CHÉP phép tính layout() của engine.js sang CSS, nên
 * nó TRÔI ĐƯỢC: ai sửa layout() mà quên scene.css thì trang vẫn chạy, chỉ có
 * cú nhảy lúc tải. Ca dưới đọc hằng THẬT từ engine.js rồi tính lại từng hệ số
 * — cùng khuôn tracer-web-sync / insert-gate-sync.
 *
 * Đã đo khớp trong trình duyệt (bản dựng): 390×844 lệch 0,21px · 820×1180
 * 0,02 · 821×900 0 · 1440×900 0 · 1920×1080 0,02 · 2560×1080 0,01.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GH = join(HERE, '..', '..', 'src', 'components', 'goc-hoc');
const doc = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');
const ENGINE = doc(join(GH, 'engine.js'));
const CSS = doc(join(GH, 'scene.css')).replace(/\/\*[\s\S]*?\*\//g, '');
const ROOM = doc(join(GH, 'StudyRoom.tsx'));
const SHELL = doc(join(GH, 'shell.js'));

/** Một nhóm bắt từ engine.js; không khớp thì nói rõ đổi gì. */
function bat(re, ten) {
  const m = re.exec(ENGINE);
  assert.ok(m, `engine.js không còn khớp "${ten}" — layout() đổi cấu trúc thì sửa ca này VÀ scene.css .gh-cho-phong.`);
  return m.slice(1).map(Number);
}
const [IW, IH] = bat(/const IW = (\d+), IH = (\d+);/, 'IW/IH');
const [NGUONG] = bat(/L\.mobile = W <= (\d+);/, 'ngưỡng điện thoại');
const [SIDE_MAX, SIDE_MIN, SIDE_VW] = bat(/Math\.min\((\d+), Math\.max\((\d+), W\*([\d.]+)\)\)/, 'bề rộng cột phải');
const [SIDE_LE] = bat(/L\.sideLeft = W - side - (\d+);/, 'lề cột phải');
const [HEP] = bat(/if \(IW\*s < W\*([\d.]+)\)/, 'sàn bề ngang máy tính');
const [CL, CR, AVAIL0, AVAIL1_LE] = bat(/const cL = (\d+), cR = (\d+), avail0 = (\d+), avail1 = L\.sideLeft - (\d+);/, 'vùng nội dung');
const [OY_HS] = bat(/\(H - IH\*s\)\*([\d.]+)\)/, 'hệ số oy máy tính');
const [STAGE, PHONG] = bat(/const stageH = H\*([\d.]+); const s = Math\.max\(stageH\/IH\*([\d.]+), W\/IW\);/, 'tỉ lệ điện thoại');
const [TAM_X] = bat(/W\/2 - (\d+)\*s/, 'tâm ngang điện thoại');
const [OY_ST, TAM_Y] = bat(/stageH\*([\d.]+) - (\d+)\*s/, 'tâm dọc điện thoại');

/** Khối `.gh-cho-phong{…}` ở phạm vi gốc và trong @media điện thoại. */
const mediaMo = CSS.indexOf(`@media (max-width: ${NGUONG}px){\n  .gh-cho-phong`);
const KHOI_GOC = (() => { const d = CSS.indexOf('.gh-cho-phong{'); return CSS.slice(d, CSS.indexOf('}', d)); })();
const KHOI_DT = mediaMo < 0 ? '' : CSS.slice(mediaMo, CSS.indexOf('}', CSS.indexOf('.gh-cho-phong{', mediaMo)));
const so = (s) => Number(s);
const gan = (a, b, ten) => assert.ok(Math.abs(a - b) <= 5e-5 * Math.max(1, Math.abs(b)), `${ten}: scene.css ghi ${a}, layout() cho ra ${b.toFixed(5)}`);

test('ngưỡng điện thoại của khung giữ chỗ = ngưỡng L.mobile của engine', () => {
  assert.ok(mediaMo >= 0, `scene.css thiếu @media (max-width: ${NGUONG}px) cho .gh-cho-phong — ngưỡng hai bên phải trùng.`);
});

test('khung MÁY TÍNH: từng hệ số trong scene.css khớp phép tính của layout()', () => {
  const rw = /--rw:max\(([\d.]+)dvh,([\d.]+)vw\)/.exec(KHOI_GOC);
  assert.ok(rw, 'Không đọc được --rw máy tính.');
  gan(so(rw[1]), (100 * IW) / IH, 'RW theo chiều cao (s = H/IH)');
  gan(so(rw[2]), 100 * HEP, 'RW sàn bề ngang');
  const trai = /calc\((\d+)px - ([\d.]+)\*var\(--rw\)\)/.exec(KHOI_GOC);
  assert.ok(trai, 'Không đọc được nhánh căn trái.');
  gan(so(trai[1]), AVAIL0, 'avail0');
  gan(so(trai[2]), CL / IW, 'cL/IW');
  const giua = /calc\(\(100vw - clamp\((\d+)px,([\d.]+)vw,(\d+)px\) - (\d+)px\)\/2 - ([\d.]+)\*var\(--rw\)\)/.exec(KHOI_GOC);
  assert.ok(giua, 'Không đọc được nhánh căn giữa.');
  gan(so(giua[1]), SIDE_MIN, 'cột phải tối thiểu');
  gan(so(giua[2]), 100 * SIDE_VW, 'cột phải theo vw');
  gan(so(giua[3]), SIDE_MAX, 'cột phải tối đa');
  // (avail0 + avail1)/2 = (avail0 + W − side − lề − avail1_lề)/2
  gan(so(giua[4]), SIDE_LE + AVAIL1_LE - AVAIL0, 'hằng trừ trong tâm vùng trống');
  gan(so(giua[5]), (CL + CR) / 2 / IW, '(cL+cR)/2/IW');
  const tren = /top:min\(0px,calc\(([\d.]+)\*\(100dvh - ([\d.]+)\*var\(--rw\)\)\)\)/.exec(KHOI_GOC);
  assert.ok(tren, 'Không đọc được top máy tính.');
  gan(so(tren[1]), OY_HS, 'hệ số oy');
  gan(so(tren[2]), IH / IW, 'IH/IW');
});

test('khung ĐIỆN THOẠI: từng hệ số trong scene.css khớp phép tính của layout()', () => {
  const rw = /--rw:max\(([\d.]+)dvh,100vw\)/.exec(KHOI_DT);
  assert.ok(rw, 'Không đọc được --rw điện thoại.');
  gan(so(rw[1]), (100 * STAGE * PHONG * IW) / IH, 'RW theo chiều cao (stageH/IH·hệ số)');
  const trai = /calc\(50vw - ([\d.]+)\*var\(--rw\)\)/.exec(KHOI_DT);
  assert.ok(trai, 'Không đọc được left điện thoại.');
  gan(so(trai[1]), TAM_X / IW, 'tâm ngang/IW');
  const tren = /calc\(([\d.]+)dvh - ([\d.]+)\*var\(--rw\)\)/.exec(KHOI_DT);
  assert.ok(tren, 'Không đọc được top điện thoại.');
  gan(so(tren[1]), 100 * STAGE * OY_ST, 'stageH·hệ số oy');
  gan(so(tren[2]), TAM_Y / IW, 'tâm dọc/IW');
});

test('khung giữ chỗ dùng ĐÚNG ảnh và ĐÚNG lớp tối của khung hình đầu', () => {
  // Cùng URL với #roomImg ⇒ cảnh dùng lại bản đã tải, không tải lần hai.
  const anhCanh = /<img id="roomImg" src="([^"]+)"/.exec(SHELL);
  const anhCho = /className="gh-cho-phong" src="([^"]+)"/.exec(ROOM);
  assert.ok(anhCanh && anhCho, 'Không đọc được src của #roomImg hoặc của khung giữ chỗ.');
  assert.equal(anhCho[1], anhCanh[1]);
  // Màu lớp tối = màu #dark ở đầu màn mở đầu (--r = -700px ⇒ phủ đều màu ấy).
  const toiCanh = /#dark\{[^}]*?(rgba\([^)]+\)) calc\(var\(--r\)/.exec(CSS);
  const toiCho = /\.gh-cho-toi\{[^}]*background:(rgba\([^)]+\))/.exec(CSS);
  assert.ok(toiCanh && toiCho, 'Không đọc được màu lớp tối của #dark hoặc .gh-cho-toi.');
  assert.equal(toiCho[1], toiCanh[1]);
});

test('khung giữ chỗ là ANH EM của host, không nằm trong host', () => {
  // Engine ghi đè host.innerHTML; React không được sở hữu nút nào ở đó.
  assert.match(ROOM, /<div ref=\{hostRef\} \/>/, 'host phải là div rỗng tự đóng.');
});

test('trang chủ KHÔNG cuộn: body không giữ lề mặc định 8px', () => {
  // edu-responsive.css đặt overflow-x:hidden lên html ở ≤ 1023px ⇒ <html> thành
  // vùng cuộn; còn 8px lề thì trang chủ cuộn 8px, có thanh cuộn, và #app hẹp đi
  // 16px làm engine chọn nhầm bố cục điện thoại (đo ở 821px: lệch 500px).
  const body = /(?:^|\n)body\{([^}]*)\}/.exec(CSS);
  assert.ok(body, 'scene.css không còn quy tắc body.');
  assert.match(body[1], /margin:0/);
});
