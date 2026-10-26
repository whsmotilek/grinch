/* ================================================================
   GRINCHIN v4.2 · ДВЕРЬ «О бренде» → window.GV.door (геометрия для соседей: лента roll.js, проверки)
   v4.2 (M3): на телефоне больше НЕТ «камеры» по слову и залипания — дверь стала фоном блока (about.html, motion.css).
   Показ двери не требует JS ни на одном экране; здесь только замеры: где на экране зелёное слово GRINCHIN
   (второй зелёный рядом не ставить) и заголовок (перекрывать нельзя).
   Кадры и рамка слова в пикселях исходника (замер по лаймовым пикселям + контур, без рулона и отражения):
     desktop / ландшафт — door-A3 (door-1440/2560), object-fit cover, object-position 50% 42%;
     телефон poster     — door-A2 4:5 (door-m-*), кадр по ширине, без обрезки;
     телефон diorama    — door-A1 9:16 (door-t-*, ?mdoor=diorama), кадр по ширине, без обрезки.
   ================================================================ */
(function () {
  'use strict';
  var D = document, W = window;
  var door = D.querySelector('[data-door]'); if (!door) return;
  var cap = door.querySelector('.ab-door-cap'), img = door.querySelector('.ab-door-img');
  if (!cap || !img) return;
  var GV = W.GV = W.GV || {};
  var MQ = W.matchMedia('(max-width: 767px) and (orientation: portrait)');
  var F = {
    desk: { iw: 2688, ih: 1520, x0: 302, x1: 2304, y0: 466, y1: 963, py: 0.42 },
    poster: { iw: 1792, ih: 2240, x0: 245, x1: 1580, y0: 805, y1: 1190, py: 0 },
    diorama: { iw: 1520, ih: 2688, x0: 185, x1: 1365, y0: 1025, y1: 1430, py: 0 }
  };
  function frame() { return MQ.matches ? (F[door.getAttribute('data-mdoor')] || F.poster) : F.desk; }

  // прямоугольники в координатах окна [x0, y0, x1, y1] на текущую прокрутку.
  // block — весь блок; view/photo — кадр; word — зелёное слово; title — заголовок; free — нет (кадр целиком «картинка»).
  function zones() {
    var R = function (r) { return [Math.round(r[0]), Math.round(r[1]), Math.round(r[2]), Math.round(r[3])]; };
    var f = frame(), b = door.getBoundingClientRect(), t = cap.getBoundingClientRect(), i = img.getBoundingClientRect();
    var k = Math.max(i.width / f.iw, i.height / f.ih), ox = i.left + (i.width - f.iw * k) * 0.5, oy = i.top + (i.height - f.ih * k) * f.py;
    return { mode: 'static', block: R([b.left, b.top, b.right, b.bottom]), title: R([t.left, t.top, t.right, t.bottom]),
      view: R([i.left, i.top, i.right, i.bottom]), photo: R([i.left, i.top, i.right, i.bottom]),
      word: R([ox + f.x0 * k, oy + f.y0 * k, ox + f.x1 * k, oy + f.y1 * k]), free: [] };
  }
  var f0 = F.desk;
  GV.door = { word: { iw: f0.iw, ih: f0.ih, x0: f0.x0, x1: f0.x1, y0: f0.y0, y1: f0.y1 },
    variant: function () { return MQ.matches ? (door.getAttribute('data-mdoor') || 'poster') : 'desktop'; },
    state: function () { return { on: false, near: false, g: null, tf: '', cv: '' }; },
    pose: function () { return null; }, zones: zones, refresh: function () {} };
})();
