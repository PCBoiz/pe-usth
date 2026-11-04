/**
 * Ô NHẬP NHIỀU DÒNG (<textarea>) của màn bài học phải nằm TRONG thẻ chứa nó.
 *
 * VÌ SAO FILE NÀY TỒN TẠI: đo trên production 390×844 (PY06, 04/11/2026):
 *  · ô soạn mã bài tập (SandboxEditor — 138 bài tập được chấm) rộng 349px
 *    trong thẻ code 317px. Thẻ có `overflow: hidden` nên 32px phải bị CẮT:
 *    chữ chạy sát mép phải, mất ~2 ký tự cuối của mỗi dòng gãy, con trỏ gõ ở
 *    cuối dòng chui vào chỗ không thấy;
 *  · ô trả lời màn luyện tập (.practiceInput — 669 màn) thò 30px ra ngoài
 *    thẻ trắng, nhìn thấy bằng mắt.
 *
 * Nguyên nhân CHUNG: trang bài học không nạp `style.css` — chỗ duy nhất có
 * `* { box-sizing: border-box }` — nên <textarea> giữ content-box, và cả bốn ô
 * (SandboxEditor, PracticeScreen, Recap, SelfExplain) đều viết `width: 100%`
 * kèm padding. Sửa MỘT chỗ: `.chrome textarea` trong LessonChrome.module.css.
 *
 * GIỚI HẠN: ca ở đây đọc mã nguồn, không dựng trang. Phép chứng minh hình học
 * là phép đo trên trình duyệt (ghi trong commit); ca này canh để quy tắc không
 * bị gỡ và không ô nào tự đè nó lại.
 *
 * ABLATION — gỡ từng mảnh rồi đếm:
 *   gỡ `.chrome textarea { box-sizing }`                 → 1 đỏ
 *   đổi thành `content-box`                              → 1 đỏ
 *   SandboxEditor đè `boxSizing: 'content-box'` nội tuyến → 1 đỏ
 *   .practiceInput đè `box-sizing: content-box`          → 1 đỏ
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', '..', 'src');
const doc = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');
const boChuThichCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/** Phần CSS ngoài mọi @media (quy tắc phải áp ở MỌI khổ màn). */
function phamViGoc(css) {
  let out = '', i = 0;
  while (i < css.length) {
    const m = css.indexOf('@media', i);
    if (m < 0) { out += css.slice(i); break; }
    out += css.slice(i, m);
    let sau = 1, j = css.indexOf('{', m) + 1;
    while (j < css.length && sau > 0) { if (css[j] === '{') sau++; else if (css[j] === '}') sau--; j++; }
    i = j;
  }
  return out;
}

const CHROME_CSS = boChuThichCss(doc(join(SRC, 'components', 'lesson-chrome', 'LessonChrome.module.css')));

test('LessonChrome đặt border-box cho MỌI <textarea> trong khung bài học', () => {
  const goc = phamViGoc(CHROME_CSS);
  const m = /(^|\})\s*\.chrome textarea\s*\{([^}]*)\}/.exec(goc);
  assert.ok(m, 'Thiếu quy tắc `.chrome textarea {…}` ở phạm vi gốc — ô soạn mã bài tập lại rộng hơn thẻ 32px và bị cắt.');
  assert.match(m[2], /box-sizing\s*:\s*border-box/, `.chrome textarea không đặt box-sizing: border-box (đang: ${m[2].trim()}).`);
});

/** Mọi <textarea> trong các component dựng ở trang bài học pe-da. */
function oNhap() {
  const thuMuc = [join(SRC, 'components', 'lesson-chrome'), join(SRC, 'components', 'python-studio', 'screens')];
  const out = [];
  const di = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) di(p);
      else if (e.name.endsWith('.tsx')) {
        const s = doc(p);
        for (const m of s.matchAll(/<textarea\b/g)) out.push({ p, s, at: m.index });
      }
    }
  };
  thuMuc.forEach(di);
  return out;
}

test('không ô nào tự đè lại box-sizing — nội tuyến hay trong lớp CSS của nó', () => {
  const ds = oNhap();
  // Sàn: bốn ô đã đo (SandboxEditor, PracticeScreen, Recap, SelfExplain). Quét
  // ra ít hơn nghĩa là phép quét hỏng, và ca này sẽ XANH vì không xét gì.
  assert.ok(ds.length >= 4, `chỉ thấy ${ds.length} <textarea> — phép quét hỏng hoặc ô đã dời chỗ.`);
  for (const { p, s, at } of ds) {
    const the = s.slice(at, s.indexOf('/>', at));
    const ten = p.slice(SRC.length + 1);
    assert.doesNotMatch(the, /boxSizing\s*:/, `${ten}: <textarea> tự đặt boxSizing nội tuyến — style nội tuyến thắng quy tắc .chrome textarea.`);
    const lop = /className=\{(\w+)\.(\w+)\}/.exec(the);
    if (!lop) continue;
    const imp = new RegExp(`import\\s+${lop[1]}\\s+from\\s+'([^']+\\.css)'`).exec(s);
    assert.ok(imp, `${ten}: không tìm ra file CSS của ${lop[1]}.${lop[2]} — đổi cách import thì sửa ca này.`);
    const duongCss = imp[1].startsWith('@/') ? join(SRC, imp[1].slice(2)) : join(dirname(p), imp[1]);
    assert.ok(existsSync(duongCss), `${ten}: ${imp[1]} không tồn tại.`);
    const css = boChuThichCss(doc(duongCss));
    for (const r of css.matchAll(new RegExp(`\\.${lop[2]}(?![\\w-])[^{]*\\{([^}]*)\\}`, 'g'))) {
      assert.doesNotMatch(r[1], /box-sizing\s*:\s*(content-box|inherit|initial|unset)/,
        `${ten}: .${lop[2]} đè box-sizing — ô lại rộng hơn thẻ chứa nó.`);
    }
  }
});
