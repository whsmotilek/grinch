/* H5 · v5 HERO «маскот у гаража» — живое без видео + точка рта для заставки.
   API: GV.hero5 = {key(), data, ready(): Promise (кадр декодирован), mouth(s): контур рта в координатах экрана при зуме s,
        zoom(s): «камера» вокруг центра рта (заставка ведёт её при раскрытии), dim(o): затемнение сцены 0..1, release(), hold(),
        lightAt(pat, t, run)/lightOn()/dark(): свет на слоях (заставка), out(q, r): выход из hero в точку q (для проверок)}.
   Рот: доли кадра из hero5-data.json × рамка <img> (getBoundingClientRect) — совпадает при любом вписывании, ресайзе и повороте.
   Пока идёт заставка (html[data-loader=full] без data-loader=done), параллакс выключен: камера — у заставки.
   Живое: маскот-слой «дышит» (CSS), фонарь мерцает (CSS), параллакс курсора (точный указатель) и прокрутки (rAF только когда
   что-то меняется и hero в кадре); выход — свет гаснет, глаза+улыбка, вариант OUT (v51). reduced-motion / ?shot=1 — стоит. */
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
  GV.hero5 = { data: DATA, key: key, mouth: mouth, zoom: zoom, dim: dim, ready: ready, release: function () { zoom(1); lightOn(); GV.hero5.eyes && GV.hero5.eyes(0); live = true; kick(); },
    hold: function () { live = false; cam.style.transform = frame.style.transform = lit.style.transform = mz.style.transform = ''; } };
  /* заставка: свет (lightAt/lightOn/dark — ниже) и «чеширские» глаза; stickTop — для перевода фронта света в координаты экрана */
  GV.hero5.lightAt = function (pat, t, run) { return lightAt(pat, t, run); }; GV.hero5.lightOn = function () { lightOn(); };
  GV.hero5.dark = function () { dark(); }; GV.hero5.stickTop = function () { return stickTop(); };
  GV.hero5.eyes = function (o) { loadEyes(); ches.classList.toggle('is-on', o > .001); eyes.style.opacity = o > .001 ? o.toFixed(3) : '0'; eyes.style.transform = ''; sv.style.opacity = '0'; line.style.opacity = '0'; };
  /* ворота заставки (loader.html gate): кадр hero нужного размера декодирован + слой «чеширских» глаз (он виден в темноте до вспышек) */
  // v51: + слой конуса (вспышки) — декодирован заранее, иначе первая вспышка платит декодом (длинный кадр)
  function decoded(im) { if (!im) return Promise.resolve(false);
    return new Promise(function (res) { var ok = function () { (im.decode ? im.decode() : Promise.resolve()).then(res, res); };
      if (im.complete && im.naturalWidth) ok(); else { im.addEventListener('load', ok, { once: true }); im.addEventListener('error', res, { once: true }); } }); }
  GV.hero5.preload = function () { loadEyes(); return Promise.all([eyes && eyes.src ? decoded(eyes) : false, decoded(hero.querySelector('.h5-cone-i'))]); };
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

  /* ---------- СВЕТ НА СЛОЯХ (v51, iOS-дружелюбно) ----------
     Слои (hero5.html): кадр → .h5-curtain («тьма», #0b0b0b с мягким верхним краем) → .h5-lit (конус = кадр в луче лампы с альфой,
     дымка лампы, пере-свет). Анимируются ТОЛЬКО opacity конуса/дымки/пере-света и transform шторки — заранее заданными
     ключевыми кадрами WAAPI (композитор, без покадрового JS и без mask/градиентов/filter в анимации).
     Шаблон full (1,5 с): 0–45 % — лампа зажигается неуверенно, 3 вспышки разной длины и силы (конус мигает над тьмой);
     45–100 % — горит: конус держится, шторка «стекает» вниз (рожки → лицо → плечи → дверь), пере-свет вспыхивает и оседает.
     quick (0,62 с) — одна вспышка. Заставка играет шаблон вперёд (lightAt(pat, t, true)), «свет гаснет» при прокрутке —
     тот же full назад, ставя время (lightAt('full', t, false)). Свет горит — анимаций нет, слои в покое (lightOn). */
  var curtain = hero.querySelector('.h5-curtain'), lit = hero.querySelector('.h5-lit'), coneEl = hero.querySelector('.h5-cone'),
      glowEl = hero.querySelector('.h5-glow'), flash = hero.querySelector('.h5-flash');
  // вспышки [начало, конец, сила] — доли фазы мигания (79/61/159 мс при full)
  var FLS = { full: [[0, .13, .5], [.32, .42, .3], [.6, .86, .8]], quick: [[.2, .78, .72]] }, PH = .45, DUR = { full: 1.5, quick: .62 };
  // стекание: мягкий разгон и посадка (ease-in-out), кусочно-линейно по этим точкам — свет читается сверху вниз, а не вспыхивает целиком
  var ES = [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1];
  function ease(s) { s = Math.min(1, Math.max(0, s)); return s < .5 ? 2 * s * s : 1 - 2 * (1 - s) * (1 - s); }
  function tY(v) { return 'translate3d(0,' + v.toFixed(1) + 'px,0)'; }
  var LA = null;
  function kill() { if (LA) { LA.list.forEach(function (a) { a.cancel(); }); LA = null; } }
  function build(pat) {
    kill();
    var sh = stick.clientHeight, E = .32 * sh, D = DUR[pat], T0 = -E, T1 = sh + 2;
    var co = [{ offset: 0, opacity: 0 }], gl = [{ offset: 0, opacity: 0 }];
    FLS[pat].forEach(function (f) { var a = f[0] * PH, b = f[1] * PH;
      co.push({ offset: a, opacity: 0 }, { offset: a + .004, opacity: f[2] }, { offset: b, opacity: f[2] }, { offset: b + .004, opacity: 0 });
      gl.push({ offset: a, opacity: 0 }, { offset: a + .004, opacity: f[2] * .9 }, { offset: b, opacity: f[2] * .9 }, { offset: b + .004, opacity: 0 }); });
    co.push({ offset: PH, opacity: 0 }, { offset: PH + .004, opacity: 1 }, { offset: 1, opacity: 1 });
    gl.push({ offset: PH, opacity: 0 }, { offset: PH + .004, opacity: .9 }, { offset: 1, opacity: .85 });
    var cu = [{ offset: 0, transform: tY(T0) }, { offset: PH, transform: tY(T0) }];
    ES.forEach(function (s) { if (s > 0) cu.push({ offset: PH + (1 - PH) * s, transform: tY(T0 + (T1 - T0) * ease(s)) }); });
    var pk = pat === 'quick' ? .7 : 1;
    var fx = [{ offset: 0, opacity: 0 }, { offset: PH, opacity: 0 }, { offset: PH + .2 * (1 - PH), opacity: pk }, { offset: PH + .55 * (1 - PH), opacity: .3 * pk }, { offset: 1, opacity: 0 }];
    var o = { duration: D * 1000, fill: 'both', easing: 'linear' };
    LA = { pat: pat, D: D, sh: sh, E: E, T0: T0, T1: T1, list: [coneEl.animate(co, o), glowEl.animate(gl, o), curtain.animate(cu, o), flash.animate(fx, o)] };
    LA.list.forEach(function (a) { a.pause(); a.currentTime = 0; });
    return LA;
  }
  /* фронт света (px от верха сцены) в момент t — середина мягкого края шторки; до горения −1 */
  function front(t) {
    if (!LA) return 1e9; var f = t / LA.D; if (f <= PH) return -1;
    var s = (f - PH) / (1 - PH), i = 1; while (i < ES.length - 1 && ES[i] < s) i++;
    var a = ES[i - 1], b = ES[i], k = b > a ? Math.min(1, (s - a) / (b - a)) : 1, e = ease(a) + (ease(b) - ease(a)) * k;
    return LA.T0 + (LA.T1 - LA.T0) * e + LA.E / 2;
  }
  /* свет шаблона pat в момент t (с): run — дальше играет композитор (сверяемся, только если ушли > 120 мс), иначе стоит */
  function lightAt(pat, t, run) {
    if (!LA || LA.pat !== pat || Math.abs(LA.sh - stick.clientHeight) > 2) build(pat);
    t = Math.max(0, Math.min(LA.D, t)); var ms = t * 1000, a0 = LA.list[0];
    hero.classList.add('is-out');
    if (run) { if (a0.playState !== 'running' || Math.abs((a0.currentTime || 0) - ms) > 120) LA.list.forEach(function (a) { a.currentTime = ms; a.play(); }); }
    else LA.list.forEach(function (a) { if (a.playState === 'running') a.pause(); a.currentTime = ms; });
    return front(t);
  }
  function lightOn() { kill(); hero.classList.remove('is-out'); }
  function dark() { lightAt('full', 0, false); }
  function stickTop() { return stick.getBoundingClientRect().top; }

  /* ---------- ВЫХОД из hero (липкая сцена + ход 60svh) ----------
     q — доля хода (0 — покой, 1 — сцена отпускается и уезжает вверх, снизу каталог «Дроп 01»), r — на сколько высот сцены она
     уже уехала после отпускания. 0–.42 свет гаснет (тот же full назад: шторка тьмы поднимается от пола, конус втягивается,
     3 мигания, тьма), 0–.12 гаснет интерфейс; дальше — вариант OUT[OUTV] (одна функция на вариант, подставляется ?out=…).
     Только transform/opacity. reduced-motion / ?shot=1 — хода нет, простой кроссфейд в темноту (frameTick). */
  var ches = hero.querySelector('.h5-ches'), cf = hero.querySelector('.h5-ches-f'), eyes = hero.querySelector('.h5-eyes'),
      sv = hero.querySelector('.h5-smile'), sp = sv.querySelector('path'), line = hero.querySelector('.h5-line'),
      uis = [].slice.call(hero.querySelectorAll('.h5-ui'));
  var cl = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; }, sm = function (a, b, v) { var t = cl((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  var io = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var bump = function (a, b, v) { return Math.sin(Math.PI * cl((v - a) / (b - a))); };
  var OUTV = (location.search.match(/[?&]out=(blink|line)\b/) || [])[1] || 'blink';
  hero.setAttribute('data-out', OUTV);
  /* геометрия в координатах сцены: контур рта (статичный путь SVG), центр и ширина рта */
  var G = null;
  function geo() {
    if (G) return G; var d = DATA[key()]; if (!d || !d.mouth) return null;
    var sw = stick.clientWidth, sh = stick.clientHeight, fl = frame.offsetLeft, ft = frame.offsetTop, fw = frame.offsetWidth, fh = frame.offsetHeight, m = d.mouth, s = 'M';
    m.pts.forEach(function (p, i) { s += (i ? 'L' : '') + (fl + p[0] * fw).toFixed(1) + ' ' + (ft + p[1] * fh).toFixed(1); });
    sp.setAttribute('d', s + 'Z'); sv.setAttribute('viewBox', '0 0 ' + sw + ' ' + sh);
    var cx = fl + m.center[0] * fw, cy = ft + (m.left[1] + m.right[1]) / 2 * fh, mw = Math.hypot((m.right[0] - m.left[0]) * fw, (m.right[1] - m.left[1]) * fh);
    sv.style.transformOrigin = cx.toFixed(1) + 'px ' + cy.toFixed(1) + 'px';
    G = { sw: sw, sh: sh, cx: cx, cy: cy, mw: mw }; return G;
  }
  var OUT = {
    /* 1 «Моргнул и исчез» (по умолчанию): в темноте проступают глаза и улыбка; глаза медленно моргают (.46–.55) и закрываются
       (.64–.76) — веки = scaleY слоя глаз; улыбка тает последней (.78–.96); снизу поднимается каталог */
    blink: function (q) {
      var a = sm(.24, .38, q), lid = 1 - .92 * Math.max(bump(.46, .56, q), sm(.64, .76, q));
      eyes.style.opacity = (.95 * a * (1 - sm(.7, .8, q))).toFixed(3);
      eyes.style.transform = lid < .999 ? 'scale(1,' + Math.max(.04, lid).toFixed(3) + ')' : '';
      sv.style.opacity = (a * (1 - sm(.78, .96, q))).toFixed(3); sv.style.transform = ''; line.style.opacity = '0';
    },
    /* 3 «Улыбка → разделитель» (?out=line): глаза гаснут, улыбка распрямляется (scale по рту: вширь на всю сцену, по высоте → 0)
       и сменяется тонкой светлой линией; линия опускается к низу сцены и становится границей — после отпускания каталог
       раскрывается под ней, а линия уходит вверх вместе со сценой и растворяется */
    line: function (q, r) {
      var g = G, a = sm(.24, .38, q), e = io(sm(.42, .62, q));
      eyes.style.opacity = (.95 * a * (1 - sm(.4, .5, q))).toFixed(3); eyes.style.transform = '';
      sv.style.transform = e > 0 ? 'scale(' + (1 + (g.sw * 1.12 / g.mw - 1) * e).toFixed(4) + ',' + (1 - .97 * e).toFixed(4) + ')' : '';
      sv.style.opacity = (a * (1 - sm(.58, .66, q))).toFixed(3);
      line.style.opacity = (sm(.56, .63, q) * (1 - sm(.12, .55, r))).toFixed(3);
      line.style.transform = 'translate3d(0,' + (g.cy + (g.sh - 2 - g.cy) * io(sm(.66, 1, q))).toFixed(1) + 'px,0)';
    }
  };
  var outPx = 1, eyesKey = '';
  function loadEyes() { var k = key(); if (eyesKey === k || !eyes) return; eyesKey = k; eyes.src = eyes.getAttribute('data-' + k) || ''; }
  var lastQ = -1, lastR = -1;
  function out(q, r) {
    r = r || 0; if (q === lastQ && r === lastR) return; lastQ = q; lastR = r;
    var u = 1 - cl(q / .42);   // равномерно: стекание назад ≈ q 0–.23, мигания .23–.42
    if (u >= 1) lightOn(); else lightAt('full', u * DUR.full, false);
    var ui = 1 - sm(.02, .12, q); uis.forEach(function (e) { e.style.opacity = ui < 1 ? ui.toFixed(3) : ''; e.style.visibility = ui <= 0 ? 'hidden' : ''; });
    var on = q > .2 && !!geo(); ches.classList.toggle('is-on', on);
    if (!on) { eyes.style.opacity = sv.style.opacity = line.style.opacity = '0'; eyes.style.transform = sv.style.transform = ''; return; }
    loadEyes(); OUT[OUTV](q, r);
  }


  /* ---------- параллакс курсора и прокрутка ---------- */
  var vis = true, px = 0, py = 0, tx = 0, ty = 0, raf = 0, hh = 1, stTop = 0;
  function measure() { hh = hero.offsetHeight || 1; outPx = Math.max(1, hh - stick.offsetHeight); stTop = parseFloat(getComputedStyle(stick).top) || 0; G = null; lastQ = -1; if (LA && !live) kill(); }
  function frameTick() {
    raf = 0; if (!live || !vis) return;
    var cm = calm(), more = false, ht = hero.getBoundingClientRect().top, q = cm ? 0 : cl((stTop - ht) / outPx),
        r = cm ? 0 : Math.max(0, (stTop - ht - outPx) / (stick.offsetHeight || 1));
    if (!cm) {
      var k = 1 - sm(0, .1, q);   // курсорный параллакс стихает, когда начинается переход
      tx += (px * k - tx) * .08; ty += (py * k - ty) * .08; more = Math.abs(px * k - tx) > .002 || Math.abs(py * k - ty) > .002;
      frame.style.transform = (Math.abs(tx) > 1e-3 || Math.abs(ty) > 1e-3) ? 'translate3d(' + (-10 * tx).toFixed(2) + 'px,' + (-6 * ty).toFixed(2) + 'px,0)' : '';
      cf.style.transform = lit.style.transform = frame.style.transform;
      mz.style.transform = (Math.abs(tx) > 1e-3 || Math.abs(ty) > 1e-3) ? 'translate3d(' + (-4 * tx).toFixed(2) + 'px,' + (-3 * ty).toFixed(2) + 'px,0)' : '';
      out(q, r);
    } else {
      // reduced-motion: хода нет — простое затемнение по мере ухода hero (кроссфейд в темноту, дальше каталог)
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
  /* для проверок: GV.hero5.out(q, r) — поставить выход в момент q (0..1; r — после отпускания) без прокрутки */
  GV.hero5.out = function (q, r) { live = false; measure(); out(cl(q), r || 0); };

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
