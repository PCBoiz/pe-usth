/* Hiệu ứng chuột.
 *  1. Card/ô có [data-fx] hoặc khớp CARD: đốm sáng bám con trỏ (--cx --cy);
 *     [data-fx="tilt"] và .course-card còn nghiêng 3D tối đa ~6° và nhấc 4px.
 *  2. Nút chính nhích về phía con trỏ vài px (--mx --my).
 * Chỉ chạy trên thiết bị có chuột và khi không bật "giảm chuyển động".
 *
 * ĐÃ GỠ (04/11/2026): hai "đèn" xanh + đỏ bám chuột. Phần VẼ của chúng
 * (html.edu-fx::before/::after trong edu-theme.css) đã bỏ từ đợt sang bảng
 * lofi, và ds-contrast.test.mjs cấm dựng lại — nhưng file này vẫn chạy một
 * vòng rAF ghi 4 biến --ax --ay --bx --by lên <html> MỖI KHUNG khi chuột di
 * chuyển. Biến khai trên <html> thì mọi phần tử thừa kế, nên mỗi lần ghi là
 * tính lại style CẢ TRANG cho một thứ không ai đọc. Đo trên production
 * (/courses, 1440×900, CPU 1×, rê chuột giả ~60 Hz trong 3 s): style 161 ms/s,
 * luồng chính bận 23%; chặn đúng 4 lần ghi đó → 0 ms/s, bận 6%. */
(function () {
  if (typeof window === 'undefined' || window.__eduFx) return;
  window.__eduFx = true;
  var mq = window.matchMedia;
  if (!mq) return;
  if (!mq('(hover: hover) and (pointer: fine)').matches) return;
  if (mq('(prefers-reduced-motion: reduce)').matches) return;

  var root = document.documentElement;
  root.classList.add('edu-fx');

  var CARD = '[data-fx], .course-card, .cd-block, .cd-card, .section-card';
  var BTN = '.btn-main, .btn-primary, .card-btn-enroll, .cd-enroll-btn, .streak-btn-go';
  var TILT_MAX = 6;
  var lastCard = null, lastBtn = null;

  function closest(el, sel) { return el && el.closest ? el.closest(sel) : null; }
  function resetCard(c) {
    if (!c) return;
    c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); c.style.removeProperty('--ty');
  }
  function resetBtn(b) {
    if (!b) return;
    b.style.removeProperty('--mx'); b.style.removeProperty('--my');
  }
  function leave() {
    resetCard(lastCard); resetBtn(lastBtn); lastCard = lastBtn = null;
  }

  document.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;

    var card = closest(e.target, CARD);
    if (lastCard && lastCard !== card) resetCard(lastCard);
    lastCard = card;
    if (card) {
      card.classList.add('edu-fx-card');
      var r = card.getBoundingClientRect();
      var px = e.clientX - r.left, py = e.clientY - r.top;
      card.style.setProperty('--cx', px + 'px');
      card.style.setProperty('--cy', py + 'px');
      if (card.getAttribute('data-fx') === 'tilt' || card.classList.contains('course-card')) {
        card.classList.add('edu-fx-tilt');
        card.style.setProperty('--ry', (((px / r.width) - 0.5) * 2 * TILT_MAX).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - (py / r.height)) * 2 * TILT_MAX).toFixed(2) + 'deg');
        card.style.setProperty('--ty', '-4px');
      }
    }

    var btn = closest(e.target, BTN);
    if (lastBtn && lastBtn !== btn) resetBtn(lastBtn);
    lastBtn = btn;
    if (btn) {
      btn.classList.add('edu-fx-btn');
      var br = btn.getBoundingClientRect();
      var dx = (e.clientX - (br.left + br.width / 2)) / br.width;
      var dy = (e.clientY - (br.top + br.height / 2)) / br.height;
      btn.style.setProperty('--mx', (dx * 8).toFixed(1) + 'px');
      btn.style.setProperty('--my', (dy * 6).toFixed(1) + 'px');
    }
  }, { passive: true });

  document.documentElement.addEventListener('mouseleave', leave);
})();
