/* Hiệu ứng chuột cho giao diện xanh–đỏ.
 *  1. Đèn xanh (bám sát) + đỏ (đuổi chậm) sau nội dung: chỉ cập nhật 4 biến CSS
 *     --ax --ay --bx --by trên <html>; phần vẽ nằm ở html::before/::after trong
 *     edu-theme.css (không chèn DOM → không gây lỗi hydration).
 *  2. Card/ô có [data-fx] hoặc khớp CARD: đốm sáng bám con trỏ (--cx --cy);
 *     [data-fx="tilt"] và .course-card còn nghiêng 3D tối đa ~6° và nhấc 4px.
 *  3. Nút chính nhích về phía con trỏ vài px (--mx --my).
 * Chỉ chạy trên thiết bị có chuột và khi không bật "giảm chuyển động". */
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
  var tx = -999, ty = -999, ax = -999, ay = -999, bx = -999, by = -999;
  var raf = 0, seen = false;
  var lastCard = null, lastBtn = null;

  function frame() {
    ax += (tx - ax) * 0.3; ay += (ty - ay) * 0.3;
    bx += (tx - bx) * 0.11; by += (ty - by) * 0.11;
    root.style.setProperty('--ax', ax.toFixed(1) + 'px');
    root.style.setProperty('--ay', ay.toFixed(1) + 'px');
    root.style.setProperty('--bx', bx.toFixed(1) + 'px');
    root.style.setProperty('--by', by.toFixed(1) + 'px');
    var moving = Math.abs(tx - bx) + Math.abs(ty - by) > 0.5;
    raf = moving ? requestAnimationFrame(frame) : 0;
  }

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
    root.classList.remove('edu-fx-on'); seen = false;
    resetCard(lastCard); resetBtn(lastBtn); lastCard = lastBtn = null;
  }

  document.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY;
    if (!seen) {
      seen = true; ax = bx = tx; ay = by = ty;
      root.classList.add('edu-fx-on');
    }
    if (!raf) raf = requestAnimationFrame(frame);

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
