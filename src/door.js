/* ================================================================
   GRINCHIN v3.1 · ДВЕРЬ НА ТЕЛЕФОНЕ (T2) → window.GV.door
   Фото door.jpg 1448×1086: слово GRINCHIN из скотча — x 144–1324, y 386–603 (замер по лаймовым пикселям).
   На телефоне-портрете кадр cover режет слово до «NCH». Решение — «камера» по прокрутке:
     1) с последней трети въезда и до ~45 % залипания — камера в масштабе cover идёт вдоль слова G → N
        (буквы проходят по одной-две, как будто читаешь дверь глазами);
     2) затем отъезд: масштаб падает до «слово во всю ширину с полями 14 px», дверь видна целиком,
        заголовок поднимается под неё — дверь + «One way or another.» собираются в постер по центру кадра;
     3) хвост ~8 % — покой, кадр отпускается и уезжает вверх как обычный блок.
   Залипание — 80svh сверх кадра (CSS --door-run), высота задана заранее → CLS 0.
   Два слоя (.ab-door-cam и заголовок .ab-door-cap), только transform; один rAF, только когда блок рядом с экраном (IntersectionObserver).
   Картинка в камере — <canvas> 1448×1086 c door-cam.* (растушёвка верха/низа запечена в файл), а не <img>: у <img> в слое
   с will-change Chrome перерастрирует тайлы при смене масштаба (GPU-задача 160–180 мс в начале прохода, замер T2),
   у canvas (bitmaprenderer) — готовая текстура, масштаб и сдвиг ничего не перерисовывают. Декод — fetch →
   createImageBitmap (вне главного потока), за полтора экрана до блока. Не вышло — обычный <img> (.cv-fail).
   reduced-motion / ?shot=1 / ландшафт / ≥768 px — ничего не делаем, CSS рисует статичный кадр.
   ================================================================ */
(function () {
  'use strict';
  var D = document, H = D.documentElement, W = window;
  var door = D.querySelector('[data-door]'); if (!door) return;
  var frame = door.querySelector('.ab-door-frame'), cam = door.querySelector('.ab-door-cam'), cap = door.querySelector('.ab-door-cap');
  if (!frame || !cam || !cap) return;
  var GV = W.GV = W.GV || {};
  var SHOT = H.dataset.shot === '1';
  var MQ = W.matchMedia('(max-width: 767px) and (orientation: portrait) and (prefers-reduced-motion: no-preference)');

  var IW = 1448, IH = 1086, WX0 = 144, WX1 = 1324, WCX = 734, WCY = 494;
  var PAD_PAN = 14, PAD_FIT = 14;                    // поля у краёв кадра: при проходе и в финале
  var CAP_IN = .1;                                   // в финале заголовок заходит на растаявший низ фото на 10 % его высоты
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var sine = function (t) { return .5 - .5 * Math.cos(Math.PI * t); };
  var io3 = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  var on = false, near = false, raf = 0, last = '', G = null, cv = '';
  var img = cam.querySelector('img');

  function measure() {
    var fw = frame.clientWidth, fh = frame.clientHeight;
    if (!fw || !fh) return null;
    var kc = fh / IH;                                   // масштаб cover: при проходе картинка по высоте кадра
    // Слой камеры — ровно 1448×1086 физ. пикселей (ширина 1448/DPR CSS px): растр = исходник 1:1, без лишних
    // мегапикселей. В cover при DPR 3 был бы 3168×2376 (×5 по площади) — это давало кадр 116–133 мс на входе.
    // Резкость та же: исходник всё равно 1448 px, больше деталей в нём нет.
    var dpr = Math.max(1, Math.min(3, W.devicePixelRatio || 1));
    cam.style.width = (IW / dpr) + 'px'; cam.style.height = (IH / dpr) + 'px';
    var base = 1 / dpr;
    var hh = parseFloat(W.getComputedStyle(frame).top) || 0;
    var run = Math.max(1, door.offsetHeight - fh);
    // проход: центр кадра по x в координатах картинки — от «G у левого края» до «N у правого»
    var half = fw / 2 / kc;
    var pA = WX0 - PAD_PAN / kc + half, pB = WX1 + PAD_PAN / kc - half;
    if (pB < pA) pA = pB = WCX;                        // слово влезает и в cover — проход не нужен
    var kf = Math.min(kc, (fw - 2 * PAD_FIT) / (WX1 - WX0));
    // финал — «постер»: дверь целиком + заголовок сразу под ней, группа по центру кадра (чуть выше — оптический центр)
    var capTop = cap.offsetTop, capH = cap.offsetHeight, ih = IH * kf;
    var group = ih * (1 - CAP_IN) + capH, top = Math.max(0, (fh - group) * .46);
    var ayF = top + WCY * kf, capF = top + ih * (1 - CAP_IN);
    return { fw: fw, fh: fh, kc: kc, base: base, hh: hh, run: run, pA: pA, pB: pB, kf: kf, ayF: ayF, capDy: Math.min(0, capF - capTop) };
  }

  // y = сколько пройдено от начала залипания (0 — кадр лёг под шапку; run — отпускается)
  function pose(y) {
    var g = G, y0 = -g.fh * .3, y1 = g.run * .45, y2 = g.run * .92;
    var tp = sine(clamp((y - y0) / (y1 - y0)));
    var y1b = y1 - (y1 - y0) * .12;                    // отъезд начинается чуть раньше конца прохода — без «мёртвой» точки
    var tf = io3(clamp((y - y1b) / (y2 - y1b)));
    var px = g.pA + (g.pB - g.pA) * tp;                 // точка картинки в центре кадра (проход)
    var Px = px + (WCX - px) * tf, Py = WCY;            // точка картинки, которую держим в «якоре»
    var Ax = g.fw / 2, Ay = WCY * g.kc + (g.ayF - WCY * g.kc) * tf;
    var k = Math.exp(Math.log(g.kc) + (Math.log(g.kf) - Math.log(g.kc)) * tf);
    var tx = Ax - Px * k, ty = Ay - Py * k;
    return { tx: tx, ty: ty, s: k / g.base, k: k, cy: g.capDy * tf, tp: tp, tf: tf };
  }

  function tick() {
    raf = 0; if (!on || !G) return;
    var y = G.hh - door.getBoundingClientRect().top;
    var p = pose(y);
    var v = 'translate3d(' + p.tx.toFixed(2) + 'px,' + p.ty.toFixed(2) + 'px,0) scale(' + p.s.toFixed(5) + ')';
    if (v !== last) { cam.style.transform = v; cap.style.transform = p.cy ? 'translate3d(0,' + p.cy.toFixed(2) + 'px,0)' : ''; last = v; }
  }
  function kick() { if (on && near && !raf) raf = W.requestAnimationFrame(tick); }

  // ---- картинка камеры в canvas ----
  function fail() { cv = 'fail'; door.classList.add('cv-fail'); }
  function paint(src) {
    var c = D.createElement('canvas'); c.width = IW; c.height = IH; c.className = 'ab-door-cv';
    c.setAttribute('role', 'img'); c.setAttribute('aria-label', img.alt || '');
    // bitmaprenderer: ImageBitmap становится текстурой как есть — ни одной отрисовки (2d-фолбэк — один drawImage)
    var r = src.close ? c.getContext('bitmaprenderer') : null;
    if (r) r.transferFromImageBitmap(src);
    else { var x = c.getContext('2d', { alpha: false }); if (!x) return fail(); x.drawImage(src, 0, 0, IW, IH); if (src.close) src.close(); }
    cam.appendChild(c); cv = 'on';
    W.requestAnimationFrame(function () { door.classList.add('cv-on'); });
  }
  function load() {
    if (cv || !img) return; cv = 'loading';
    function go() {
      var url = img.currentSrc || img.src;
      var p = (W.fetch && W.createImageBitmap)
        ? W.fetch(url).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (bl) { return W.createImageBitmap(bl); })
        : (img.decode ? img.decode() : Promise.resolve()).then(function () { return img; });
      p.then(paint, function () { (img.decode ? img.decode() : Promise.resolve()).then(function () { paint(img); }, fail); });
    }
    if (img.complete && img.naturalWidth) go();
    else { img.addEventListener('load', go, { once: true }); img.addEventListener('error', fail, { once: true }); img.loading = 'eager'; }
  }

  function setup() {
    var want = !SHOT && H.classList.contains('js') && MQ.matches;
    door.classList.toggle('is-cam', want);
    if (!want) { on = false; G = null; if (last || cam.style.width) { cam.style.transform = cap.style.transform = cam.style.width = cam.style.height = ''; last = ''; } return; }
    cap.style.transform = ''; G = measure(); on = !!G; last = '';
    if (on) { near = true; tick(); near = isNear(); if (!cv && isNear(1.5)) load(); }   // поворот в портрет рядом с блоком
  }
  function isNear(f) { var r = door.getBoundingClientRect(), m = f ? W.innerHeight * f : 200; return r.bottom > -m && r.top < W.innerHeight + m; }

  if ('IntersectionObserver' in W) {
    new IntersectionObserver(function (es) { near = es[es.length - 1].isIntersecting; kick(); }, { rootMargin: '200px 0px' }).observe(door);
    // загрузка картинки — за полтора экрана до блока
    var lio = new IntersectionObserver(function (es) { if (es[es.length - 1].isIntersecting && on) { load(); lio.disconnect(); } }, { rootMargin: '150% 0px' });
    lio.observe(door);
  } else { near = true; if (on) load(); }
  W.addEventListener('scroll', kick, { passive: true });
  var rz = 0;
  W.addEventListener('resize', function () { if (!rz) rz = W.requestAnimationFrame(function () { rz = 0; setup(); }); }, { passive: true });
  if (MQ.addEventListener) MQ.addEventListener('change', setup); else if (MQ.addListener) MQ.addListener(setup);
  setup();

  // Геометрия для соседей (рулон ленты T1): прямоугольники в координатах окна [x0, y0, x1, y1] на текущую прокрутку.
  // block — весь блок; view — видимый кадр двери; photo — фото; word — зелёное слово (второй зелёный рядом не ставить);
  // title — заголовок (перекрывать нельзя); free — чёрные полосы кадра без фото и текста (тут ленте можно всё).
  function zones() {
    var R = function (r) { return [Math.round(r[0]), Math.round(r[1]), Math.round(r[2]), Math.round(r[3])]; };
    var b = door.getBoundingClientRect(), t = cap.getBoundingClientRect(), out = { mode: on ? 'cam' : 'static', block: R([b.left, b.top, b.right, b.bottom]), title: R([t.left, t.top, t.right, t.bottom]) };
    if (on && G) {
      var ft = Math.min(Math.max(b.top, G.hh), b.bottom - G.fh), p = pose(G.hh - b.top), k = p.k;
      var ph = [p.tx, ft + p.ty, p.tx + IW * k, ft + p.ty + IH * k];
      out.view = R([0, ft, G.fw, ft + G.fh]); out.photo = R(ph); out.progress = { pan: +p.tp.toFixed(3), pull: +p.tf.toFixed(3) };
      out.word = R([p.tx + WX0 * k, ft + p.ty + 386 * k, p.tx + WX1 * k, ft + p.ty + 603 * k]);
      // фото тает в чёрный в верхних 9 % и нижних 20 % — это тоже «свободно»
      var top = ph[1] + IH * k * .09, bot = Math.min(ph[3] - IH * k * .2, t.top);
      out.free = [R([0, ft, G.fw, Math.max(ft, top)]), R([0, Math.max(t.bottom, bot), G.fw, ft + G.fh])].filter(function (r) { return r[3] - r[1] > 8; });
    } else {
      var i = img.getBoundingClientRect(), iw = i.width, ih = i.height, k2 = Math.max(iw / IW, ih / IH);
      var ox = i.left + (iw - IW * k2) * .5, oy = i.top + (ih - IH * k2) * .46;
      out.view = out.photo = R([i.left, i.top, i.right, i.bottom]);
      out.word = R([ox + WX0 * k2, oy + 386 * k2, ox + WX1 * k2, oy + 603 * k2]);
      out.free = [];
    }
    return out;
  }

  GV.door = { state: function () { return { on: on, near: near, g: G, tf: last, cv: cv }; }, pose: function (y) { return G ? pose(y) : null; }, zones: zones, refresh: setup };
})();
