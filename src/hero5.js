/* H5 · v5 HERO «маскот у гаража» — живое без видео + точка рта для заставки.
   API: GV.hero5 = {key(), data, ready(): Promise (кадр декодирован), mouth(s): контур рта в координатах экрана при зуме s,
        zoom(s): «камера» вокруг центра рта (заставка ведёт её при раскрытии), dim(o): затемнение сцены 0..1, release(), hold(),
        out(q): поставить переход hero → #tape в точку q (для проверок)}.
   Рот: доли кадра из hero5-data.json × рамка <img> (getBoundingClientRect) — совпадает при любом вписывании, ресайзе и повороте.
   Пока идёт заставка (html[data-loader=full] без data-loader=done), параллакс выключен: камера — у заставки.
   Живое: маскот-слой «дышит» (CSS), фонарь мерцает (CSS), параллакс курсора (точный указатель) и прокрутки (rAF только когда
   что-то меняется и hero в кадре), к низу hero сцена темнеет в фон #tape. reduced-motion / ?shot=1 — стоит. */
(function () {
  'use strict';
  var D = document, H = D.documentElement, W = window, GV = W.GV = W.GV || {};
  var hero = D.getElementById('hero'); if (!hero || !hero.classList.contains('h5')) return;
  var stick = hero.querySelector('.h5-stick'), cam = hero.querySelector('.h5-cam'), frame = hero.querySelector('.h5-frame'), img = hero.querySelector('.h5-img'),
      mz = hero.querySelector('.h5-mz'), mzi = hero.querySelector('.h5-mz-i'), dimEl = hero.querySelector('.h5-dim');
  var DATA = {}; try { DATA = JSON.parse(D.getElementById('h5-data').textContent); } catch (e) { }
  var PQ = W.matchMedia('(max-aspect-ratio: 1/1)'), RM = W.matchMedia('(prefers-reduced-motion: reduce)');
  var SHOT = H.dataset.shot === '1', FINE = W.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var key = function () { return PQ.matches ? 'm' : 'd'; };
  var calm = function () { return SHOT || RM.matches; };
  var Z = 1, ox = 0, oy = 0;   // зум заставки и его центр (px внутри hero)

  /* рамка кадра без зума: зум идёт вокруг центра рта, поэтому центр рта от зума не зависит — пересчитываем обратно */
  function frameRect() {
    var r = img.getBoundingClientRect();
    if (Z === 1) return { l: r.left, t: r.top, w: r.width, h: r.height };
    var hr = stick.getBoundingClientRect(), cx = hr.left + ox, cy = hr.top + oy;
    return { l: cx + (r.left - cx) / Z, t: cy + (r.top - cy) / Z, w: r.width / Z, h: r.height / Z };
  }
  /* контур рта на экране при зуме s (вокруг центра рта): {pts:[[x,y]…], marks, color, c:[x,y], w — ширина рта px} */
  function mouth(s) {
    var d = DATA[key()]; if (!d || !d.mouth) return null;
    var m = d.mouth, r = frameRect(), k = s || 1;
    var cx = r.l + m.center[0] * r.w, cy = r.t + m.center[1] * r.h;
    var pts = m.pts.map(function (p) { var x = r.l + p[0] * r.w, y = r.t + p[1] * r.h; return [cx + (x - cx) * k, cy + (y - cy) * k]; });
    var lx = r.l + m.left[0] * r.w, ly = r.t + m.left[1] * r.h, rx = r.l + m.right[0] * r.w, ry = r.t + m.right[1] * r.h;
    return { pts: pts, marks: m.marks, color: m.color, c: [cx, cy], w: Math.hypot(rx - lx, ry - ly) * k, frame: r };
  }
  function zoom(s) {
    if (s === 1) { Z = 1; cam.style.transform = ''; return; }
    if (Z === 1) {   // центр зума — центр рта, в px внутри hero (фиксируем в начале)
      var m = mouth(1), hr = stick.getBoundingClientRect();
      if (m) { ox = m.c[0] - hr.left; oy = m.c[1] - hr.top; cam.style.transformOrigin = ox.toFixed(1) + 'px ' + oy.toFixed(1) + 'px'; }
    }
    Z = s; cam.style.transform = 'scale(' + s.toFixed(5) + ')';
  }
  var dimV = 0;
  function dim(o) { dimV = o; dimEl.style.opacity = o > .001 ? o.toFixed(3) : ''; }
  var readyP = null;
  function ready() {
    if (readyP) return readyP;
    readyP = new Promise(function (res) {
      var done = function () { res(true); };
      if (img.complete && img.naturalWidth) { (img.decode ? img.decode() : Promise.resolve()).then(done, done); return; }
      img.addEventListener('load', function () { (img.decode ? img.decode() : Promise.resolve()).then(done, done); }, { once: true });
      img.addEventListener('error', done, { once: true });
    });
    return readyP;
  }
  var live = false;   // заставка закончилась — параллакс и прокрутка наши
  GV.hero5 = { data: DATA, key: key, mouth: mouth, zoom: zoom, dim: dim, ready: ready, release: function () { zoom(1); light(1); GV.hero5.eyes && GV.hero5.eyes(0); live = true; kick(); },
    hold: function () { live = false; cam.style.transform = frame.style.transform = mz.style.transform = ''; } };
  /* заставка: свет и «чеширские» глаза (u — см. light ниже), stickTop — для перевода фронта света в координаты экрана */
  GV.hero5.light = function (u, opt) { return light(u, opt); }; GV.hero5.stickTop = function () { return stickTop(); };
  GV.hero5.eyes = function (o) { loadEyes(); ches.classList.toggle('is-on', o > .001); eyes.style.opacity = o > .001 ? o.toFixed(3) : '0'; sv.style.opacity = '0'; bt.style.opacity = '0'; };
  /* ворота заставки (loader.html gate): кадр hero нужного размера декодирован + слой «чеширских» глаз (он виден в темноте до вспышек) */
  GV.hero5.preload = function () {
    loadEyes(); if (!eyes || !eyes.src) return Promise.resolve(false);
    return new Promise(function (res) { var ok = function () { (eyes.decode ? eyes.decode() : Promise.resolve()).then(res, res); };
      if (eyes.complete && eyes.naturalWidth) ok(); else { eyes.addEventListener('load', ok, { once: true }); eyes.addEventListener('error', res, { once: true }); } });
  };
  GV.hero5.eyesY = function () { var d = DATA[key()]; return d && d.eyes ? frame.offsetTop + (d.eyes[1] + d.eyes[3] * .6) * frame.offsetHeight : 0; };   // hold — для покадровой проверки заставки (GV.loader.seek)

  /* маскот-слой: тот же кадр, вырезан по фигуре; грузится после раскрытия, проявляется только декодированным */
  var mzKey = '';
  function loadMz() {
    var k = key(), d = DATA[k]; if (!d || !d.mz || !mzi) return;
    if (mzKey === k) return; mzKey = k; mz.classList.remove('is-on');
    var src = (mzi.getAttribute('data-' + k) || '').split('|'); if (src.length < 2) return;
    mzi.onload = function () { (mzi.decode ? mzi.decode() : Promise.resolve()).then(function () { if (mzKey === k) mz.classList.add('is-on'); }, function () { }); };
    mzi.sizes = Math.max(1, Math.round(frame.getBoundingClientRect().width * d.mz[2])) + 'px';
    mzi.srcset = src[0] + ' ' + d.mz[4] + 'w, ' + src[1] + ' ' + d.mz[5] + 'w';
    mzi.src = src[0];
  }
  if (PQ.addEventListener) PQ.addEventListener('change', function () { if (mzKey) loadMz(); });

  /* ---------- переход hero → #tape: «свет гаснет», Чеширский кот, улыбка → лента ----------
     q = доля хода липкой сцены (0 — hero в покое, 1 — сцена отпускается и уезжает вверх, следом блок #tape).
     .10–.34 фонарь мигает (провалы по ходу прокрутки) и гаснет; .10–.42 сцена уходит в темноту (затемнение до .95);
     .26–.42 проступают блики глаз и светлая улыбка (контур рта с кадра); .48–.80 улыбка вытягивается в ленту по линии ленты
     блока #tape (угол и толщина — как у T1: вариант GV.tapeblock.v, desktop/телефон), цвет — в лайм; .74–.88 печать IGNORE THE SIGNS;
     .90–1 лента утягивается вдоль себя вниз-вправо — «уходит» в блок скотча, где T1 раскатывает свою. */
  /* ---------- СВЕТ: общий код включения (заставка) и выключения (прокрутка к #tape) ----------
     light(u): u — «сколько света» 0..1. 0 — полная тьма; 0..0,45 — лампа зажигается неуверенно: 3 вспышки разной длины и силы,
     на каждой сцена проступает в узком холодном конусе сверху, между ними — тьма; 0,45..1 — лампа горит: конус «доливается» сверху
     вниз (рожки → лицо → плечи → краем дверь и надпись), расширяется, затем проступает вся сцена (финальная экспозиция = кадр).
     Включение в заставке идёт по u вперёд, «свет гаснет» при прокрутке — тот же u назад (мигания те же, в обратном порядке).
     Конус — маска на слое сцены (conic ∩ linear, mask-composite), тьма — фон hero #0b0b0b; яркость вспышек — затемнение .h5-dim.
     Цвет света — версии (html[data-light]: cold — холодный белый, warm — янтарь; токены --lt-* в hero5.css). */
  // вспышки [начало, конец, сила] в долях фазы мигания (u 0..0,45). B1 29.10: чуть длиннее — каждая читается (79/61/159 мс при 4,3 с заставки)
  var FLS = { full: [[0, .13, .5], [.32, .42, .3], [.6, .86, .8]], quick: [[.2, .78, .72]] };
  var flash = hero.querySelector('.h5-flash'), glowEl = hero.querySelector('.h5-glow'), maskOn = '', lastFront = -1;
  function lampXY() { var d = DATA[key()], lp = (d && d.lamp) || [.5, .06];
    return [frame.offsetLeft + lp[0] * frame.offsetWidth, frame.offsetTop + (lp[1] + .015) * frame.offsetHeight]; }
  function setMask(m) {
    if (m === maskOn) return; maskOn = m; var st = cam.style;
    st.webkitMaskImage = st.maskImage = m;
    st.webkitMaskComposite = m ? 'source-in' : ''; st.maskComposite = m ? 'intersect' : '';
  }
  /* конус: вершина чуть выше лампы (ширина абажура, а не точка), мягкие края; по высоте луч слабеет к низу (fall — сколько
     остаётся у пола), фронт «долива» — мягкий край 140 px. base — сколько света вне конуса (0 — тьма, 1 — весь кадр) */
  function cone(L, a, soft, base, front, fall) {
    var b = 'rgba(0,0,0,' + base.toFixed(3) + ')', lo = 'rgba(0,0,0,' + Math.max(base, fall).toFixed(3) + ')', sh = stick.clientHeight;
    return 'conic-gradient(from 180deg at ' + L[0].toFixed(1) + 'px ' + (L[1] - .08 * sh).toFixed(1) + 'px,#000 0deg ' + a.toFixed(2) + 'deg,' + b + ' ' + (a + soft).toFixed(2) + 'deg ' + (360 - a - soft).toFixed(2) + 'deg,#000 ' + (360 - a).toFixed(2) + 'deg),' +
      'linear-gradient(180deg,#000 ' + L[1].toFixed(0) + 'px,' + lo + ' ' + Math.max(L[1] + 1, front - 140).toFixed(0) + 'px,' + b + ' ' + front.toFixed(0) + 'px)';
  }
  function light(u, opt) {
    u = u < 0 ? 0 : u > 1 ? 1 : u; opt = opt || {};
    var fl = FLS[opt.pattern || 'full'], over = opt.over || 0, sh = stick.clientHeight, L, it = 0;
    hero.classList.toggle('is-out', u < 1);
    if (flash) flash.style.opacity = over > .001 ? over.toFixed(3) : '';
    if (u >= 1) { setMask(''); dim(0); glowEl.style.opacity = ''; lastFront = 1e9; return lastFront; }
    if (u <= 0) { setMask(''); dim(1); glowEl.style.opacity = '0'; lastFront = -1; return lastFront; }   // полная тьма (видны только «чеширские» глаза и улыбка)
    L = lampXY();
    if (u < .45) {
      var f = u / .45; for (var i = 0; i < fl.length; i++) if (f >= fl[i][0] && f < fl[i][1]) it = fl[i][2];
      setMask(cone(L, 9, 12, 0, sh + 200, .4)); dim(1 - it); glowEl.style.opacity = (it * .9).toFixed(3);
      lastFront = it > 0 ? sh + 200 : -1;
    } else {
      var s = (u - .45) / .55, e = 1 - Math.pow(1 - cl(s / .62), 3), front = L[1] + (sh - L[1] + 220) * e;
      setMask(cone(L, 9 + 34 * sm(.15, .85, s), 12 + 12 * s, sm(.5, 1, s), front, .4 + .6 * sm(.3, .9, s))); dim(0); glowEl.style.opacity = '.9';
      lastFront = front;
    }
    return lastFront;   // фронт света (px от верха сцены): по нему гаснут «чеширские» глаза и улыбка
  }
  function stickTop() { return stick.getBoundingClientRect().top; }
  var ches = hero.querySelector('.h5-ches'), cf = hero.querySelector('.h5-ches-f'), eyes = hero.querySelector('.h5-eyes'),
      sv = hero.querySelector('.h5-smile'), sp = sv.querySelector('path'), bt = hero.querySelector('.h5-band-t'), glow = hero.querySelector('.h5-glow'),
      uis = [].slice.call(hero.querySelectorAll('.h5-ui'));
  var cl = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; }, sm = function (a, b, v) { var t = cl((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  var io = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  function hx(c) { return [1, 3, 5].map(function (i) { return parseInt(c.substr(i, 2), 16); }); }
  // светлая улыбка в темноте — цвет лампы версии (hero5.css --lt-pale: холодный белый / янтарь)
  var PALE = hx((getComputedStyle(H).getPropertyValue('--lt-pale').trim() || '#ecf2ea')), LIME = hx('#8ed308');
  function mixc(a, b, t) { return 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }).join(',') + ')'; }
  /* геометрия перехода (в координатах сцены): контур рта и прямоугольник ленты с общими ориентирами, по N точек */
  var G = null, NP = 240;
  function segLen(P, a, b) { var s = 0, n = P.length; for (var i = a; i !== b; i = (i + 1) % n) { var j = (i + 1) % n; s += Math.hypot(P[j][0] - P[i][0], P[j][1] - P[i][1]); } return s; }
  function sampleSeg(P, a, b, cnt, out) { var n = P.length, tot = segLen(P, a, b), step = tot / cnt, acc = 0, i = a, want = 0, k = 0;
    while (k < cnt) { var j = (i + 1) % n, dl = Math.hypot(P[j][0] - P[i][0], P[j][1] - P[i][1]);
      while (k < cnt && want <= acc + dl + 1e-9) { var t = dl ? (want - acc) / dl : 0; out.push([P[i][0] + (P[j][0] - P[i][0]) * t, P[i][1] + (P[j][1] - P[i][1]) * t]); k++; want = k * step; }
      acc += dl; i = j; if (i === b && k < cnt) { out.push([P[b][0], P[b][1]]); k++; } } }
  function geo() {
    if (G) return G;
    var d = DATA[key()]; if (!d || !d.mouth) return null;
    var sw = stick.clientWidth, sh = stick.clientHeight, fl = frame.offsetLeft, ft = frame.offsetTop, fw = frame.offsetWidth, fh = frame.offsetHeight;
    var M = d.mouth.pts.map(function (p) { return [fl + p[0] * fw, ft + p[1] * fh]; }), mk = d.mouth.marks;
    var c = [fl + d.mouth.center[0] * fw, (ft + d.mouth.left[1] * fh + ft + d.mouth.right[1] * fh) / 2];
    // линия ленты T1 (tapeblock.js compose): b — диагональ (desktop A(0;.10h)→B(w;.90h), телефон A(0;.31h)→B(w;.73h)); a — desktop поперёк, телефон вертикально
    var vw = innerWidth, vh = Math.max(520, innerHeight), mob = vw < 768, v = (GV.tapeblock && GV.tapeblock.v) || 'b', ang, th;
    if (v === 'a') { ang = mob ? Math.PI / 2 : 0; th = mob ? Math.min(96, Math.max(72, vw * .21)) : Math.min(150, Math.max(96, vw * .088)); }
    else { ang = Math.atan2((mob ? .42 : .8) * vh, vw); th = mob ? Math.min(92, Math.max(70, vw * .205)) : Math.min(146, Math.max(92, vw * .085)); }
    var ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux, L = Math.hypot(sw, sh) * 1.25, hl = L / 2, ht = th / 2;
    var P = function (a, b) { return [c[0] + ux * a + nx * b, c[1] + uy * a + ny * b]; };
    // прямоугольник: низ-центр → левый край (середина) → верх-центр → правый край (середина) — как ориентиры контура рта
    var R = [P(0, ht), P(-hl, ht), P(-hl, 0), P(-hl, -ht), P(0, -ht), P(hl, -ht), P(hl, 0), P(hl, ht)], rm = [0, 2, 4, 6];
    var tot = [0, 1, 2, 3].map(function (s) { return segLen(M, mk[s], mk[(s + 1) % 4]); }), sum = tot[0] + tot[1] + tot[2] + tot[3];
    var cnt = tot.map(function (t) { return Math.max(24, Math.round(NP * t / sum)); });
    var A = [], B = []; for (var s = 0; s < 4; s++) { sampleSeg(M, mk[s], mk[(s + 1) % 4], cnt[s], A); sampleSeg(R, rm[s], rm[(s + 1) % 4], cnt[s], B); }
    sv.setAttribute('viewBox', '0 0 ' + sw + ' ' + sh);
    bt.style.width = L.toFixed(0) + 'px'; bt.style.height = th.toFixed(1) + 'px'; bt.style.setProperty('--bt', (th * .4).toFixed(1) + 'px');
    G = { A: A, B: B, c: c, ux: ux, uy: uy, ang: ang, L: L, th: th };
    return G;
  }
  var outPx = 1, eyesKey = '';
  function loadEyes() { var k = key(); if (eyesKey === k || !eyes) return; eyesKey = k; eyes.src = eyes.getAttribute('data-' + k) || ''; }
  var lastQ = -1;
  function out(q) {
    if (q === lastQ) return; lastQ = q;
    // «свет гаснет» — тот же свет, что при включении, назад: конус втягивается вверх, сужается, 3 мигания — и тьма
    light(1 - sm(.1, .42, q));
    var u = 1 - sm(.06, .22, q); uis.forEach(function (e) { e.style.opacity = u < 1 ? u.toFixed(3) : ''; e.style.visibility = u <= 0 ? 'hidden' : ''; });
    var on = q > .24; ches.classList.toggle('is-on', on); if (!on) return;
    var g = geo(); if (!g) return;
    eyes.style.opacity = (sm(.28, .42, q) * (1 - sm(.54, .66, q))).toFixed(3);
    // B1 29.10: лента уезжает вдоль себя лишь наполовину — к q=1 её хвост ещё в кадре и уходит вверх вместе со сценой,
    // пока снизу входит блок #tape (раньше между ними было ~170 px пустой темноты)
    var e = io(sm(.48, .8, q)), sh = sm(.86, 1, q) * g.L * .42, dx = g.ux * sh, dy = g.uy * sh, s = 'M';
    for (var i = 0; i < g.A.length; i++) { var a = g.A[i], b = g.B[i]; s += (i ? 'L' : '') + (a[0] + (b[0] - a[0]) * e + dx).toFixed(1) + ' ' + (a[1] + (b[1] - a[1]) * e + dy).toFixed(1); }
    sp.setAttribute('d', s + 'Z');
    sv.style.opacity = sm(.26, .42, q).toFixed(3);
    sp.style.fill = mixc(PALE, LIME, sm(.5, .78, q));
    // печать: проявляется слева направо вдоль ленты
    var tp = sm(.74, .88, q);
    bt.style.opacity = tp > 0 ? '1' : '0';
    bt.style.clipPath = 'inset(0 ' + (100 - 100 * tp).toFixed(2) + '% 0 0)';
    var x0 = g.c[0] - g.ux * g.L / 2 + g.uy * g.th / 2 + dx, y0 = g.c[1] - g.uy * g.L / 2 - g.ux * g.th / 2 + dy;
    bt.style.transform = 'translate(' + x0.toFixed(1) + 'px,' + y0.toFixed(1) + 'px) rotate(' + (g.ang * 180 / Math.PI).toFixed(3) + 'deg)';
  }

  /* ---------- параллакс курсора и прокрутка ---------- */
  var vis = true, px = 0, py = 0, tx = 0, ty = 0, raf = 0, hh = 1, stTop = 0;
  function measure() { hh = hero.offsetHeight || 1; outPx = Math.max(1, hh - stick.offsetHeight); stTop = parseFloat(getComputedStyle(stick).top) || 0; G = null; lastQ = -1; }
  function frameTick() {
    raf = 0; if (!live || !vis) return;
    var cm = calm(), more = false, ht = hero.getBoundingClientRect().top, q = cm ? 0 : cl((stTop - ht) / outPx);
    if (!cm) {
      var k = 1 - sm(0, .1, q);   // курсорный параллакс стихает, когда начинается переход
      tx += (px * k - tx) * .08; ty += (py * k - ty) * .08; more = Math.abs(px * k - tx) > .002 || Math.abs(py * k - ty) > .002;
      frame.style.transform = (Math.abs(tx) > 1e-3 || Math.abs(ty) > 1e-3) ? 'translate3d(' + (-10 * tx).toFixed(2) + 'px,' + (-6 * ty).toFixed(2) + 'px,0)' : '';
      cf.style.transform = frame.style.transform;
      mz.style.transform = (Math.abs(tx) > 1e-3 || Math.abs(ty) > 1e-3) ? 'translate3d(' + (-4 * tx).toFixed(2) + 'px,' + (-3 * ty).toFixed(2) + 'px,0)' : '';
      out(q);
    } else {
      // reduced-motion: хода нет — простое затемнение по мере ухода hero (кроссфейд в фон #tape)
      var p = cl(-ht / hh); dim(Math.min(.85, Math.max(0, (p - .1) * 1.3)));
    }
    if (more) raf = requestAnimationFrame(frameTick);
  }
  function kick() { if (!raf && live && vis) raf = requestAnimationFrame(frameTick); }
  if (FINE) hero.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var r = stick.getBoundingClientRect(); px = (e.clientX - r.left) / r.width * 2 - 1; py = (e.clientY - r.top) / r.height * 2 - 1; kick();
  }, { passive: true });
  if (FINE) hero.addEventListener('pointerleave', function () { px = py = 0; kick(); }, { passive: true });
  W.addEventListener('scroll', function () { if (vis) kick(); }, { passive: true });
  W.addEventListener('resize', function () { measure(); kick(); }, { passive: true });
  if ('IntersectionObserver' in W) new IntersectionObserver(function (es) {
    es.forEach(function (e) { vis = e.isIntersecting; hero.classList.toggle('is-vis', vis); if (vis) kick(); });
  }, { threshold: 0 }).observe(hero);
  else hero.classList.add('is-vis');
  if (PQ.addEventListener) PQ.addEventListener('change', function () { G = null; if (eyesKey) loadEyes(); });
  measure();
  /* для проверок: GV.hero5.out(q) — поставить переход в момент q (0..1) без прокрутки */
  GV.hero5.out = function (q) { live = false; measure(); out(cl(q)); };

  D.dispatchEvent(new CustomEvent('grinchin:hero5'));   // заставка ждёт hero5 у ворот (медленная сеть: скрипт ниже по HTML)
  /* старт: после раскрытия заставки (или сразу, если заставки нет) */
  function onReady() {
    var lm = H.getAttribute('data-loader');
    if (lm === 'off' || lm === 'done') { live = true; kick(); }
    // маскот-слой — после первого кадра раскрытия (не спорит с LCP-картинкой)
    ready().then(function () { setTimeout(loadEyes, lm === 'off' ? 300 : 0); setTimeout(loadMz, lm === 'off' ? 300 : 3200); });
  }
  if (H.getAttribute('data-ready') === '1') onReady(); else D.addEventListener('grinchin:ready', onReady, { once: true });
  D.addEventListener('grinchin:loader-progress', function (e) { if (e.detail && e.detail.phase === 'done' && !live) GV.hero5.release(); });
})();
