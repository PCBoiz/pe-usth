// Lỗi đang chặn: 23 hình lý thuyết ở frontend/public/static/anim/*.svg lặp VÔ
// HẠN (một vòng 9,33–12,67 s) và được nhúng bằng `<img>` ở TheoryScreen.tsx, nên
// học viên không có cách nào dừng. Đó là trượt WCAG 2.2.2 (Pause, Stop, Hide —
// mức A): chuyển động tự khởi động, dài hơn 5 giây, chạy song song với nội dung
// khác thì PHẢI dừng được.
//
// Ca bắt lỗi:
//  - "mọi hình đều lặp vô hạn…" chứng minh tiền đề (nếu ai làm hình đứng yên
//    thì nút không còn cần nữa, và ca này nói ra điều đó).
//  - "đã dừng thì KHÔNG nguồn nào được chạy" là bất biến của bản sửa: gỡ nhánh
//    'still' trong figureSource là trượt.
//  - "mặc định đứng yên khi bật giảm chuyển động" trượt nếu đổi
//    initialFigurePlaying thành `() => true`.
//  - "TheoryScreen đã nối dây" trượt nếu nút Dừng/Chạy bị gỡ khỏi màn.
import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

import {
  animatedSvgSource,
  FIGURE_VIEW_MARGIN_PX,
  figureSource,
  figureToggleLabel,
  figureToggleText,
  initialFigurePlaying,
  sourceAnimates,
  stillSvgSource,
} from '../../src/lib/figure-motion.ts';

const ANIM_DIR = new URL('../../public/static/anim/', import.meta.url);
const FILES = readdirSync(ANIM_DIR).filter((f) => f.endsWith('.svg'));
const read = (f) => readFileSync(new URL(f, ANIM_DIR), 'utf8');

const THEORY = readFileSync(
  new URL('../../src/components/python-studio/screens/TheoryScreen.tsx', import.meta.url),
  'utf8',
);

/** Mọi tổ hợp đầu vào của figureSource. */
function* moiToHop() {
  for (const playing of [false, true])
    for (const inView of [false, true])
      for (const reduced of [false, true])
        for (const stillReady of [false, true])
          for (const motionReady of [false, true])
            yield { playing, inView, reduced, stillReady, motionReady };
}

test('có đúng 23 hình, và MỌI hình đều lặp vô hạn một vòng dài hơn 5 giây (nên WCAG 2.2.2 áp dụng)', () => {
  assert.equal(FILES.length, 23, `thấy ${FILES.length} hình`);
  for (const f of FILES) {
    const svg = read(f);
    assert.match(svg, /infinite/, `${f} không lặp vô hạn — nếu đúng thì sửa lại chú thích của test này`);
    const vong = [...svg.matchAll(/animation(?:-duration)?\s*:\s*[^;}"']*?([0-9]+(?:\.[0-9]+)?)s/g)].map((m) =>
      Number(m[1]),
    );
    assert.ok(vong.length > 0, `${f}: không đọc được thời lượng vòng`);
    assert.ok(Math.max(...vong) > 5, `${f}: vòng dài nhất ${Math.max(...vong)}s — không quá 5s thì khỏi cần nút`);
  }
});

test('MỌI hình đều có @media prefers-reduced-motion — cơ sở để coi file gốc là ĐỨNG YÊN với người bật nó', () => {
  // `sourceAnimates('file', true) === false` dựa hẳn vào điều này. Hình nào
  // thiếu khối đó là người bật giảm chuyển động vẫn bị hình chạy.
  for (const f of FILES) {
    assert.match(
      read(f),
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{\s*\*\s*\{\s*animation\s*:\s*none\s*!important/,
      `${f} thiếu khối tắt hoạt hình cho người bật giảm chuyển động`,
    );
  }
});

test('mặc định: bình thường thì CHẠY, bật giảm chuyển động thì ĐỨNG YÊN', () => {
  assert.equal(initialFigurePlaying(false), true);
  assert.equal(initialFigurePlaying(true), false);
});

test('người dùng đã bấm Dừng thì KHÔNG nguồn nào được chạy (bất biến WCAG 2.2.2)', () => {
  for (const input of moiToHop()) {
    const kind = figureSource(input);
    if (sourceAnimates(kind, input.reduced)) {
      assert.ok(input.playing, `nguồn "${kind}" vẫn chạy sau khi bấm Dừng: ${JSON.stringify(input)}`);
    }
  }
});

test('ra ngoài khung nhìn mà CHƯA có bản tĩnh thì giữ nguyên hình, không ẩn', () => {
  // Ẩn ở đây là tạo lỗi khả năng truy cập MỚI: trình đọc màn hình đọc cả trang
  // chứ không cuộn, nên nó sẽ gặp ô trống thay cho `alt` của hình. Tiết kiệm
  // main thread là việc có thì tốt, không phải đòi hỏi của WCAG 2.2.2.
  assert.equal(
    figureSource({ playing: true, inView: false, reduced: false, stillReady: false, motionReady: false }),
    'file',
  );
  for (const input of moiToHop()) {
    if (input.playing && figureSource(input) === 'none') {
      assert.fail(`ẩn hình dù người dùng không hề bấm Dừng: ${JSON.stringify(input)}`);
    }
  }
});

test('đang chạy mà đã có nguồn phù hợp thì phải THỰC SỰ chạy — nút Chạy không được là nút chết', () => {
  // Người bật giảm chuyển động bấm Chạy: phải dùng Blob đã vô hiệu hoá @media,
  // vì file gốc với họ là hình tĩnh.
  assert.equal(figureSource({ playing: true, inView: true, reduced: true, stillReady: true, motionReady: true }), 'motion');
  assert.equal(sourceAnimates('motion', true), true);
  // Người bình thường: dùng thẳng file gốc.
  assert.equal(figureSource({ playing: true, inView: true, reduced: false, stillReady: true, motionReady: true }), 'file');
  assert.equal(sourceAnimates('file', false), true);
});

test('bấm Dừng: đổi sang Blob tĩnh; chưa dựng được Blob thì ẩn hình chứ không chạy tiếp', () => {
  const base = { playing: false, inView: true, motionReady: false };
  assert.equal(figureSource({ ...base, reduced: false, stillReady: true }), 'still');
  assert.equal(figureSource({ ...base, reduced: false, stillReady: false }), 'none');
  // Với người bật giảm chuyển động, file gốc đã đứng yên nên dùng luôn: không
  // nháy một ô trống ngay khi mở màn (mặc định của họ là ĐANG DỪNG).
  assert.equal(figureSource({ ...base, reduced: true, stillReady: false }), 'file');
});

test('ra ngoài khung nhìn cũng dừng (tiết kiệm main thread, đo được 19% ở CPU 4×)', () => {
  assert.equal(
    figureSource({ playing: true, inView: false, reduced: false, stillReady: true, motionReady: true }),
    'still',
  );
  assert.ok(FIGURE_VIEW_MARGIN_PX >= 200, 'khoảng đệm phải đủ xa để cú đổi ảnh không lọt vào mắt');
});

test('nhãn và chữ trên nút đổi theo trạng thái', () => {
  assert.notEqual(figureToggleLabel(true), figureToggleLabel(false));
  assert.notEqual(figureToggleText(true), figureToggleText(false));
  assert.match(figureToggleLabel(true), /Dừng/);
  assert.match(figureToggleLabel(false), /Chạy/);
});

test('stillSvgSource chèn được vào CẢ 23 hình, nằm trong thẻ gốc và thắng mọi khai báo animation', () => {
  for (const f of FILES) {
    const goc = read(f);
    const out = stillSvgSource(goc);
    assert.ok(out, `${f}: không chèn được`);
    assert.ok(out.endsWith('</svg>') || out.endsWith('</svg>\n'), `${f}: thẻ gốc không còn đóng ở cuối`);
    // Phải nằm TRƯỚC thẻ đóng gốc, tức vẫn thuộc tài liệu SVG.
    assert.ok(
      out.lastIndexOf('<style>*{animation:none!important}</style>') < out.lastIndexOf('</svg>'),
      `${f}: thẻ style bị chèn ra ngoài thẻ gốc`,
    );
    // Và phải là khai báo CUỐI: hai !important cùng độ ưu tiên thì cái sau thắng
    // — kể cả khối @media reduce viết sẵn trong file.
    assert.ok(
      out.lastIndexOf('animation:none!important') > out.lastIndexOf('prefers-reduced-motion'),
      `${f}: thẻ style đứng trước khối @media nên không chắc thắng`,
    );
    // Không được làm hỏng phần còn lại của hình.
    assert.ok(out.startsWith(goc.slice(0, goc.lastIndexOf('</svg>'))), `${f}: nội dung gốc bị đổi`);
  }
});

test('animatedSvgSource vô hiệu hoá khối @media reduce ở CẢ 23 hình', () => {
  for (const f of FILES) {
    const out = animatedSvgSource(read(f));
    assert.ok(out, `${f}: không tìm thấy khối @media reduce để vô hiệu hoá`);
    assert.doesNotMatch(out, /prefers-reduced-motion/, `${f}: vẫn còn khối @media reduce`);
    assert.match(out, /@media \(min-width: 999999px\)/, `${f}: thiếu điều kiện không bao giờ đúng`);
  }
});

test('TheoryScreen đã nối dây: có nút Dừng/Chạy và nó quyết định bằng figureSource', () => {
  // Kiểm trên mã nguồn vì bộ test này không dựng React. Gỡ nút ra là ca này trượt.
  assert.match(THEORY, /figureSource\(/, 'TheoryScreen phải hỏi figureSource');
  assert.match(THEORY, /aria-label=\{figureToggleLabel\(/, 'nút phải có aria-label đổi theo trạng thái');
  assert.match(THEORY, /<button[\s\S]{0,300}?onClick=\{toggle\}/, 'phải có nút bấm được');
  assert.match(THEORY, /IntersectionObserver/, 'phải dừng khi hình ra ngoài khung nhìn');
  assert.doesNotMatch(
    THEORY,
    /<img src=\{figure\.src\}/,
    'gắn cứng figure.src vào <img> là trở lại lỗi cũ: không có cách dừng',
  );
});
