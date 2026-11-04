/**
 * CÁC MÀN CON CỦA GÓC HỌC TRÊN ĐIỆN THOẠI — không được CẮT nội dung.
 *
 * VÌ SAO FILE NÀY TỒN TẠI: màn "Học tiếp" (#learn) trên điện thoại cắt mất tiêu
 * đề bài, đoạn giới thiệu và mục lục — đo ở 390×844 trên production 87df502: 6
 * phần tử bị `.lesson { overflow: hidden }` cắt 102–203px. Nguyên nhân là khối
 * @media điện thoại ghi đè lưới thành `grid-template-columns: 1fr` trần. `1fr`
 * nghĩa là minmax(auto, 1fr), nên cột KHÔNG co dưới min-content — dòng mã dài
 * nhất ở khung soạn mã kéo cột ra 576,8px trong một thẻ 358px. Bản máy tính đã
 * dùng minmax(0, …) từ đầu; chính lần ghi đè cho điện thoại làm mất nó.
 *
 * Cùng khối @media còn hai lưới `1fr` trần nữa (.course, .spread) — hôm nay nội
 * dung của chúng ngắn nên chưa vỡ, nhưng cùng một cái bẫy. Ca dưới cấm cả LỚP lỗi
 * ấy trong scene.css, không chỉ chỗ đã vỡ.
 *
 * Kèm: hàng chấm bài ("M1 · 18 bài") — nhãn trong hàng flex bị bóp về
 * min-content 25px và gãy ba dòng; chấm co còn 9,3px. Sau sửa đo được: nhãn
 * một dòng, chấm 22px xuống hai hàng.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(HERE, '..', '..', 'src', 'components', 'goc-hoc', 'scene.css'), 'utf8')
  .replace(/\r/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

/** Khối @media điện thoại (cùng ngưỡng 820px với L.mobile của engine). */
function khoiDienThoai() {
  const out = [];
  let i = 0;
  while ((i = CSS.indexOf('@media (max-width: 820px){', i)) >= 0) {
    const mo = CSS.indexOf('{', i);
    let sau = 1, j = mo + 1;
    while (j < CSS.length && sau > 0) { if (CSS[j] === '{') sau++; else if (CSS[j] === '}') sau--; j++; }
    out.push(CSS.slice(mo + 1, j - 1));
    i = j;
  }
  return out.join('\n');
}
const DT = khoiDienThoai();

test('scene.css KHÔNG có lưới một cột `1fr` trần — phải là minmax(0,1fr)', () => {
  const tran = [...CSS.matchAll(/([.#][\w.#-]+)\{[^}]*grid-template-columns:\s*1fr\s*[;}]/g)].map((m) => m[1]);
  assert.deepEqual(tran, [],
    `lưới 1fr trần ở: ${tran.join(', ')} — 1fr = minmax(auto,1fr), cột không co dưới min-content và `
      + 'overflow:hidden của thẻ sẽ CẮT nội dung (đo: #learn ở 390px cắt 6 phần tử).');
});

test('.lesson dùng minmax(0,…) ở CẢ máy tính lẫn điện thoại', () => {
  assert.match(CSS, /\.lesson\{[^}]*grid-template-columns:minmax\(0,5fr\) minmax\(0,6fr\)/, 'bản máy tính đổi lưới .lesson.');
  assert.match(DT, /\.lesson\{grid-template-columns:minmax\(0,1fr\)\}/, 'khối điện thoại không còn .lesson minmax(0,1fr).');
});

test('hàng chấm bài: nhãn không gãy dòng, và trên điện thoại chấm xuống hàng ở cỡ thật', () => {
  assert.match(CSS, /\.dots span\{white-space:nowrap\}/, 'nhãn "M… · N bài" sẽ bị bóp về min-content và gãy dòng.');
  assert.match(DT, /\.dots\{flex-wrap:wrap\}/, 'điện thoại: chấm không xuống hàng ⇒ học phần 32 bài co mỗi chấm còn ~1px.');
  assert.match(DT, /\.dots i\{flex:none\}/, 'điện thoại: chấm vẫn được co.');
});
