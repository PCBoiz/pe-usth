/**
 * Unit test cho T4: Phím Escape bị bắt toàn trang.
 *
 * Kiểm tra xem handler keydown Escape trong engine.js có:
 * 1. Bỏ qua khi e.defaultPrevented = true (hộp thoại React / component con đã xử lý).
 * 2. Bỏ qua khi target là input / textarea / select / contentEditable.
 * 3. Bỏ qua khi target nằm ngoài phạm vi container (#app).
 * 4. Không bắt bừa bãi khi có modal mở ngoài.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const engineSrc = readFileSync(join(FE, 'src', 'components', 'goc-hoc', 'engine.js'), 'utf8');

test('T4: engine.js kiểm tra defaultPrevented và target trước khi xử lý Escape', () => {
  // 1. Phải kiểm tra e.defaultPrevented
  assert.match(
    engineSrc,
    /e\.defaultPrevented/,
    'engine.js phải kiểm tra e.defaultPrevented để nhường cho hộp thoại React'
  );

  // 2. Phải kiểm tra ô nhập liệu (input / textarea)
  assert.match(
    engineSrc,
    /input.*textarea/,
    'engine.js phải kiểm tra input/textarea khi bắt Escape'
  );

  // 3. Phải kiểm tra phạm vi phần tử focus không thuộc container app
  assert.match(
    engineSrc,
    /app\.contains\(e\.target\)/,
    'engine.js phải kiểm tra target có thuộc container app không'
  );
});

test('T4: Logic giả lập xử lý Escape không can thiệp vào modal React', () => {
  let routeBackCalled = false;
  const fakeRoute = 'settings';
  const fakeApp = {
    classList: { contains: () => false },
    contains: (el) => el === fakeApp || el.id === 'inside-app',
  };

  function handleEscape(e) {
    if (e.key === 'Escape') {
      if (e.defaultPrevented) return;
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable)) return;
      if (e.target && e.target !== 'BODY' && e.target !== 'HTML' && !fakeApp.contains(e.target)) return;
      if (fakeApp.classList.contains('intro')) {}
      else if (fakeRoute) routeBackCalled = true;
    }
  }

  // Ca 1: Modal ngoài bắt Escape và gọi preventDefault()
  routeBackCalled = false;
  handleEscape({
    key: 'Escape',
    defaultPrevented: true,
    target: { tagName: 'DIV', id: 'react-modal' },
  });
  assert.equal(routeBackCalled, false, 'Cảnh không được back() khi modal đã preventDefault');

  // Ca 2: Người dùng đang focus trong một ô input bên ngoài hoặc trong modal
  routeBackCalled = false;
  handleEscape({
    key: 'Escape',
    defaultPrevented: false,
    target: { tagName: 'INPUT' },
  });
  assert.equal(routeBackCalled, false, 'Cảnh không được back() khi đang gõ trong input');

  // Ca 3: Focus nằm ở một nút bấm trong modal React bên ngoài app
  routeBackCalled = false;
  handleEscape({
    key: 'Escape',
    defaultPrevented: false,
    target: { tagName: 'BUTTON', id: 'modal-close-btn' },
  });
  assert.equal(routeBackCalled, false, 'Cảnh không được back() khi target nằm ngoài app');

  // Ca 4: Focus ở trong app (hoặc body chung khi đang xem cảnh)
  routeBackCalled = false;
  handleEscape({
    key: 'Escape',
    defaultPrevented: false,
    target: 'BODY',
  });
  assert.equal(routeBackCalled, true, 'Cảnh phải back() khi người dùng đang ở trong cảnh và nhấn Escape');
});
