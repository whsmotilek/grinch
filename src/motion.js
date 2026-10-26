/* ================================================================
   GRINCHIN v3 · моушн-слой (K4) → window.GV.motion
   1. Hero: фолбэк «разметки» (asphalt) без CSS scroll-driven — тот же transform по прокрутке (ScrollTrigger или rAF).
   2. Бегущая лента (data-marquee="on"): постоянная скорость, CSS-анимация transform, пауза вне экрана.
   3. «О бренде» → story: история STOP → ST’ART v1, починенная и собранная в НОВЫЙ логотип.
      Сцена — один SVG в координатах экрана; лого/улыбка/стрелки — в координатах логотипа (1660×458),
      трансформы задаются атрибутом translate(x y) scale(s) вокруг (0,0) — «съехать» нечему (причина бага v1 — origin GSAP).
      Прокрутка → один rAF → apply(p). Sticky вместо pin. reduced-motion / ?shot=1 → два статичных кадра.
   4. [data-reveal] — разовое появление (утилита для соседей).
   Прелоадер — свой движок в loader.html (GV.loader). GSAP не обязателен.
   ================================================================ */
(function () {
  'use strict';
  var D = document, H = D.documentElement, W = window;
  var GV = W.GV = W.GV || {};
  var SHOT = H.dataset.shot === '1' || /[?&]shot=1/.test(location.search);
  var RMQ = W.matchMedia('(prefers-reduced-motion: reduce)');
  var calm = function () { return SHOT || RMQ.matches; };
  var NS = 'http://www.w3.org/2000/svg';
  H.classList.add('mx-js');
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };
  var clamp = function (a, b, v) { return v < a ? a : v > b ? b : v; };
  var seg = function (p, a, b) { return clamp(0, 1, (p - a) / (b - a)); };
  var E = { io: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }, o: function (t) { return 1 - Math.pow(1 - t, 3); },
            i: function (t) { return t * t; }, back: function (t) { var c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); } };
  function svgEl(tag, attrs, parent) { var e = D.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function whenDom(fn) { if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn, { once: true }); else fn(); }
  var axis = function (a, def) { return H.getAttribute('data-' + a) || def; };

  var M = GV.motion = GV.motion || {};
  M.isReady = !!(GV.loader && GV.loader.ready);
  D.addEventListener('grinchin:ready', function () { M.isReady = true; });

  var SH = null;
  function shapes() {
    if (SH) return SH;
    try { SH = JSON.parse($('#gv-shapes').textContent); } catch (e) { SH = null; }
    return SH;
  }
  var NUM = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
  function lerpPath(a, b) {
    var na = a.match(NUM).map(Number), nb = b.match(NUM).map(Number), pr = b.split(NUM);
    return function (t) { var s = pr[0]; for (var i = 0; i < na.length; i++) s += (+(na[i] + (nb[i] - na[i]) * t).toFixed(1)) + ' ' + pr[i + 1]; return s; };
  }
  function mixHex(a, b, t) {
    var pa = [1, 3, 5].map(function (i) { return parseInt(a.substr(i, 2), 16); }), pb = [1, 3, 5].map(function (i) { return parseInt(b.substr(i, 2), 16); });
    return '#' + pa.map(function (v, i) { var x = Math.round(v + (pb[i] - v) * t).toString(16); return x.length < 2 ? '0' + x : x; }).join('');
  }

  /* ================= 1. HERO: фолбэк «разметки» ================= */
  function heroAsphalt() {
    var hero = $('#hero'); if (!hero || axis('hero', 'asphalt') !== 'asphalt' || calm()) return;
    if (W.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()')) return;   // работает CSS
    var title = $('#hero-title'), fade = $$('.hx-sub, .hx-cta', hero), lane = $('.hx-lane', hero), dash = $('.hx-lane i', hero),
        g = $('.hx-g', hero), media = $('.hx-media-wrap', hero), vh = innerHeight, last = -1;
    function apply(y) {
      var p = clamp(0, 1, y / (vh * .55)); if (p === last && y > vh) return; last = p;
      title.style.transform = 'translateY(' + (30 * p).toFixed(3) + 'vh) rotateX(' + (74 * p).toFixed(2) + 'deg) scaleY(' + (1 + 1.9 * p).toFixed(4) + ')';
      var o = (1 - clamp(0, 1, y / (vh * .09))).toFixed(3); fade.forEach(function (e) { e.style.opacity = o; });
      if (lane) lane.style.opacity = clamp(0, 1, (y - vh * .08) / (vh * .28)).toFixed(3);
      if (dash) dash.style.transform = 'translateY(' + (50 * clamp(0, 1, y / vh)).toFixed(2) + '%)';
      var q = clamp(0, 1, y / (vh * .55));
      if (g) g.style.transform = 'translateY(' + (-16 * q).toFixed(3) + 'vh) scale(' + (1 - .32 * q).toFixed(4) + ')';
      if (media) media.style.transform = 'translateY(' + (8 * clamp(0, 1, y / vh)).toFixed(3) + '%)';
    }
    W.addEventListener('resize', function () { vh = innerHeight; last = -1; apply(W.scrollY); }, { passive: true });
    var ST = W.ScrollTrigger;
    if (ST && W.gsap) { ST.create({ start: 0, end: function () { return vh * 1.1; }, onUpdate: function () { apply(W.scrollY); } }); apply(W.scrollY); return; }
    var raf = 0;
    W.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; if (W.scrollY < vh * 1.3 || last < 1) apply(W.scrollY); }); }, { passive: true });
    apply(W.scrollY);
  }

  /* ================= 2. БЕГУЩАЯ ЛЕНТА ================= */
  var MQ_SPEED = 56;   // px/с — постоянно, от скорости прокрутки не зависит (это давало рывки в v1)
  function marquee() {
    var box = $('.hx-marquee'); if (!box || axis('marquee', 'off') !== 'on') return;
    var track = $('.hx-mq-track', box), unit = $('.hx-mq-unit', box); if (!track || !unit) return;
    function fit() {
      var uw = unit.getBoundingClientRect().width; if (!uw) return;
      var need = Math.ceil((box.clientWidth * 1.08) / uw) + 1, units = $$('.hx-mq-unit', track);
      for (var i = units.length; i < need; i++) track.appendChild(unit.cloneNode(true));
      track.style.setProperty('--mq-shift', (-uw).toFixed(2) + 'px');
      track.style.setProperty('--mq-dur', (uw / MQ_SPEED).toFixed(2) + 's');
    }
    fit();
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(fit);
    var rw = innerWidth; W.addEventListener('resize', function () { if (Math.abs(innerWidth - rw) > 40) { rw = innerWidth; fit(); } }, { passive: true });
    if ('IntersectionObserver' in W) new IntersectionObserver(function (es) { es.forEach(function (e) { box.classList.toggle('is-off', !e.isIntersecting); }); }).observe(box);
  }

  /* ================= 3. STORY: STOP → ST’ART → новый логотип ================= */
  var LW = 1660, LH = 458;
  function octagon(r) { var p = []; for (var i = 0; i < 8; i++) { var a = (22.5 + 45 * i) * Math.PI / 180; p.push((r * Math.cos(a)).toFixed(1) + ' ' + (r * Math.sin(a)).toFixed(1)); } return 'M' + p.join('L') + 'Z'; }
  function rnd(seed) { var s = 0; seed = String(seed); for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) | 0; return function () { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) % 10000) / 10000; }; }
  var uid = 0;

  /* строит сцену в svg; возвращает {layout(w,h), apply(p)} */
  function buildScene(svg) {
    var S = shapes(), letters = $$('.ld-letters .lg-l').length ? $$('.ld-letters .lg-l') : $$('#logo .lg-l');
    if (!S || !S.arr_l || !letters.length) return null;
    var GR = '#8ED308', BLK = '#0b0b0b';
    try { var c = getComputedStyle(H).getPropertyValue('--c-green').trim(); if (/^#[0-9a-f]{6}$/i.test(c)) GR = c; } catch (e) {}
    /* СЛОИ (T3 v3.1). Раньше вся сцена была одним SVG, и каждый кадр прокрутки менял атрибуты → перерисовка и растр
       всего SVG, а полосы букв ещё и с clip-path по контуру буквы (60–120 мс растра на телефоне). Теперь всё, что едет,
       едет transform/opacity композитных слоёв, а растрится один раз:
         svg      — нижний столб (гаснет атрибутом, редко);
         svgS     — знак STOP: улетает вверх CSS-transform слоя (внутри меняется только надпись, фаза .32–.5);
         svgP     — табличка/половинки улыбки: подъезд под буквы — CSS-transform слоя; финальное угасание половинок —
                    opacity слоя (остальное в табличке к этому моменту уже невидимо);
         svgF     — целая улыбка (финал, opacity слоя);   svgL — сплошные буквы (финал, opacity слоя);
         .bs-strips — полосы: div-ы сплошного цвета (растра нет) под маской буквы (.bs-l, маска растрится один раз).
       Порядок отрисовки прежний: столб → знак → табличка → улыбка → сплошные буквы → полосы. */
    var host = svg.parentNode;
    (svg._bsx || []).forEach(function (e) { if (e.parentNode) e.parentNode.removeChild(e); });
    svg._bsx = []; svg.innerHTML = '';
    var after = svg;
    var put = function (e) { host.insertBefore(e, after.nextSibling); after = e; svg._bsx.push(e); return e; };
    var mkSvg = function () { return put(svgEl('svg', { 'class': 'bs-svg', 'aria-hidden': 'true', focusable: 'false' })); };
    var svgS = mkSvg(), svgP = mkSvg(), svgF = mkSvg(), svgL = mkSvg();
    var stripsHost = D.createElement('div'); stripsHost.className = 'bs-strips'; stripsHost.setAttribute('aria-hidden', 'true'); put(stripsHost);
    // — знак STOP на столбе: верхний столб уходит вместе со знаком, нижний — под табличкой, гаснет с ней
    var poleLo = svgEl('rect', { 'class': 'bs-pole' }, svg);
    var sign = svgEl('g', {}, svgS);
    var poleHi = svgEl('rect', { 'class': 'bs-pole', x: -9, y: 0, width: 18, height: 10 }, sign);
    svgEl('path', { 'class': 'bs-sign-face', d: octagon(200), fill: '#f2f2ec' }, sign);          // заливка hex-атрибутом: не прозрачная
    svgEl('path', { 'class': 'bs-sign-ring', d: octagon(178) }, sign);
    var word = svgEl('g', {}, sign);
    var tST = svgEl('text', { 'class': 'bs-sign-txt', x: 0, y: 0, dy: '.36em', 'text-anchor': 'end', 'font-size': 104 }, word); tST.textContent = 'ST';
    var tOP = svgEl('text', { 'class': 'bs-sign-txt', x: 0, y: 0, dy: '.36em', 'text-anchor': 'start', 'font-size': 104 }, word); tOP.textContent = 'OP';
    var tART = svgEl('text', { 'class': 'bs-sign-txt', x: 0, y: 0, dy: '.36em', 'text-anchor': 'start', 'font-size': 104, opacity: 0 }, word);
    var apo = svgEl('tspan', { 'class': 'bs-apo', fill: GR }, tART); apo.textContent = '’';
    var rest = svgEl('tspan', {}, tART); rest.textContent = 'ART';
    // — табличка ←→ в координатах лого; рисуется сразу в финальном месте/масштабе, подъезд — transform слоя
    var plate = svgEl('g', {}, svgP);
    var plateBg = svgEl('g', {}, plate);
    svgEl('rect', { 'class': 'bs-plate-bg', x: 30, y: 150, width: 1600, height: 300, rx: 34 }, plateBg);
    svgEl('rect', { 'class': 'bs-plate-in', x: 58, y: 178, width: 1544, height: 244, rx: 18 }, plateBg);
    var hl = svgEl('path', { d: S.arr_l, fill: BLK }, plate), hr = svgEl('path', { d: S.arr_r, fill: BLK }, plate);
    var mkl = svgEl('path', { 'class': 'bs-marker', d: S.arr_l, pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 }, plate);
    var mkr = svgEl('path', { 'class': 'bs-marker', d: S.arr_r, pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 }, plate);
    var fullG = svgEl('g', {}, svgF); svgEl('path', { d: S.smile, fill: GR }, fullG);
    var morphL = lerpPath(S.arr_l, S.half_l), morphR = lerpPath(S.arr_r, S.half_r);
    // — буквы: полосы ленты под маской буквы; в конце — сплошные буквы (без швов)
    var logo = svgEl('g', {}, svgL), strips = [], boxes = [], r = rnd('bs'), tones = [GR, mixHex(GR, '#000000', .1), mixHex(GR, '#ffffff', .12)];
    var solid = svgEl('g', { fill: GR }, logo);
    letters.forEach(function (lp, i) {
      var d = lp.getAttribute('d');
      svgEl('path', { d: d }, solid);
      var probe = svgEl('path', { d: d }, logo), bb; try { bb = probe.getBBox(); } catch (e) { bb = null; } logo.removeChild(probe);
      if (!bb || !bb.width) bb = { x: 0, y: 0, width: 200, height: 300 };
      bb = { x: bb.x, y: bb.y, width: bb.width, height: bb.height };
      var box = D.createElement('div'); box.className = 'bs-l';
      var mk = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + bb.x + ' ' + bb.y + ' ' + bb.width + ' ' + bb.height +
        '" preserveAspectRatio="none"><path d="' + d + '"/></svg>') + '")';
      box.style.webkitMaskImage = mk; box.style.maskImage = mk;
      stripsHost.appendChild(box); boxes.push({ el: box, bb: bb });
      var n = bb.height > 120 ? 4 : 2, sh = bb.height / n;
      for (var j = 0; j < n; j++) {
        var cx = bb.x + bb.width / 2, cy = bb.y + sh * (j + .5), rot = (r() - .5) * 10;
        var el = D.createElement('i'); el.className = 'bs-st'; el.style.background = tones[(i + j) % 3]; box.appendChild(el);
        strips.push({ el: el, bb: bb, x: bb.x - 30, y: bb.y + j * sh - 3, w: bb.width + 60, h: sh + 6, cx: cx, cy: cy, rot: rot,
          dx: (r() > .5 ? 1 : -1) * (900 + r() * 900), dy: (r() - .5) * 700, da: (r() - .5) * 90, k: strips.length });
      }
    });
    var caps = $$('.bs-caps li', host), L = null, last = {};
    var set = function (el, a, v) { var key = (el._k || (el._k = ++uid)) + a; if (last[key] === v) return; last[key] = v; el.setAttribute(a, v); };
    var css = function (el, a, v) { var key = (el._k || (el._k = ++uid)) + '$' + a; if (last[key] === v) return; last[key] = v; el.style[a] = v; };
    var tf = function (x, y, s) { return 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') scale(' + s.toFixed(5) + ')'; };
    var px = function (v) { return v.toFixed(2) + 'px'; };
    var wST = 0, wART = 0, wOP = 0;
    function measure() { try { wST = tST.getComputedTextLength(); wOP = tOP.getComputedTextLength(); wART = tART.getComputedTextLength(); } catch (e) { wST = 150; wOP = 160; wART = 260; } }

    function layout(fw, fh) {
      [svg, svgS, svgP, svgF, svgL].forEach(function (e) { e.setAttribute('viewBox', '0 0 ' + fw + ' ' + fh); });
      var mob = fw < 768, top = mob ? 72 : 96, bot = mob ? 110 : 130, av = Math.max(200, fh - top - bot);
      var sr = Math.min(av * (mob ? .16 : .19), fw * (mob ? .22 : .12)), sx = fw / 2, sy = top + av * (mob ? .2 : .24);
      var pw = fw * (mob ? .86 : .44), ps = pw / LW, pcy = sy + sr + 26 + 150 * ps;      // центр таблички (лого y=300)
      var lw = Math.min(fw * (mob ? .86 : .56), 1000), ls = lw / LW, lcy = top + av * (mob ? .42 : .46);
      L = { fw: fw, fh: fh, sx: sx, sy: sy, k: sr / 200, sr: sr, ps: ps, px: sx - 830 * ps, py: pcy - 300 * ps, ls: ls, lx: fw / 2 - 830 * ls, ly: lcy - 229 * ls };
      last = {};
      set(poleLo, 'x', (sx - 9 * L.k).toFixed(1)); set(poleLo, 'width', (18 * L.k).toFixed(1));
      set(poleLo, 'y', (pcy).toFixed(1)); set(poleLo, 'height', Math.max(0, fh - pcy).toFixed(1));
      set(poleHi, 'height', ((pcy - sy) / L.k).toFixed(1));
      set(sign, 'transform', 'translate(' + sx.toFixed(1) + ' ' + sy.toFixed(1) + ') scale(' + L.k.toFixed(4) + ')');
      svgS.style.transformOrigin = px(sx) + ' ' + px(sy);
      // табличка и улыбка нарисованы в финальном месте (как буквы); подъезд — transform слоя, только уменьшение (k ≤ 1)
      set(plate, 'transform', tf(L.lx, L.ly, ls)); set(fullG, 'transform', tf(L.lx, L.ly, ls)); set(logo, 'transform', tf(L.lx, L.ly, ls));
      svgP.style.transformOrigin = '0 0';
      // маркер виден только до подъезда (масштаб слоя = ps/ls): non-scaling-stroke считает толщину без CSS-масштаба слоя,
      // поэтому толщину делим на него — на экране те же 7 px, что и раньше
      // штрих пунктира с non-scaling-stroke тоже считается в координатах SVG без масштаба слоя — растягиваем его на 1/k0
      var k0 = ps / ls, sw = (7 / k0).toFixed(3); mkl.style.strokeWidth = sw; mkr.style.strokeWidth = sw; L.k0 = k0;
      set(mkl, 'stroke-dasharray', (1 / k0).toFixed(5)); set(mkr, 'stroke-dasharray', (1 / k0).toFixed(5));
      boxes.forEach(function (B) {
        var st = B.el.style; st.left = px(L.lx + B.bb.x * ls); st.top = px(L.ly + B.bb.y * ls); st.width = px(B.bb.width * ls); st.height = px(B.bb.height * ls);
      });
      strips.forEach(function (Q) {
        var st = Q.el.style; st.left = px((Q.x - Q.bb.x) * ls); st.top = px((Q.y - Q.bb.y) * ls); st.width = px(Q.w * ls); st.height = px(Q.h * ls);
        st.transformOrigin = px((Q.cx - Q.x) * ls) + ' ' + px((Q.cy - Q.y) * ls);
      });
      measure();
    }

    function apply(p) {
      if (!L) return;
      // 1) маркер обводит стрелки, стрелки гнутся в половинки улыбки (рожки — наконечники), чернь → лайм
      var m = seg(p, .05, .2), b = E.io(seg(p, .15, .32));
      var dof = ((1 - m) / L.k0).toFixed(4); set(mkl, 'stroke-dashoffset', dof); set(mkr, 'stroke-dashoffset', dof);
      var mo = (m > 0 ? 1 : 0) * (1 - seg(p, .17, .23)); set(mkl, 'opacity', mo.toFixed(3)); set(mkr, 'opacity', mo.toFixed(3));
      var dl = morphL(b), dr = morphR(b); set(hl, 'd', dl); set(hr, 'd', dr); if (mo > 0) { set(mkl, 'd', dl); set(mkr, 'd', dr); }
      var col = mixHex(BLK, GR, seg(p, .2, .3)); set(hl, 'fill', col); set(hr, 'fill', col);
      // 2) STOP → ST’ART: O и P падают, ST сдвигается, ’ART встаёт; надпись ужимается, чтобы влезть в восьмиугольник
      var o = E.i(seg(p, .32, .42)), st = E.io(seg(p, .36, .47)), a = seg(p, .43, .5);
      set(tOP, 'transform', 'translate(' + (18 * o).toFixed(1) + ' ' + (190 * o).toFixed(1) + ') rotate(' + (34 * o).toFixed(1) + ')');
      set(tOP, 'opacity', (1 - seg(p, .36, .42)).toFixed(3));
      set(tART, 'opacity', a.toFixed(3));
      // ширина надписи вписывается в восьмиугольник (300 ед. при радиусе 200) при любом шрифте
      var s0 = Math.min(1, 292 / Math.max(1, wST + wOP)), s1 = Math.min(1, 300 / Math.max(1, wST + wART)), ws = s0 + (s1 - s0) * st;
      var wX = wOP + (wART - wOP) * st, shift = -(wX - wST) / 2 * ws;
      set(word, 'transform', 'translate(' + shift.toFixed(1) + ' 0) scale(' + ws.toFixed(4) + ')');
      set(tART, 'transform', 'translate(0 ' + (18 * (1 - E.back(a))).toFixed(1) + ')');
      // 3) знак со столбом уходит вверх целиком (столб не проходит через улыбку), табличка гаснет, когда знака уже нет
      var s = E.i(seg(p, .52, .64)), signY = L.sy - s * (L.sy + L.sr * 2.4 + 40);
      css(svgS, 'transform', 'translate(0px,' + px(signY - L.sy) + ') rotate(' + (-8 * s).toFixed(2) + 'deg)');
      css(svgS, 'opacity', (1 - seg(p, .6, .64)).toFixed(3));
      var pb = 1 - seg(p, .55, .64); set(plateBg, 'opacity', pb.toFixed(3)); set(poleLo, 'opacity', pb.toFixed(3));
      // 4) буквы собираются из влетающих полос (координаты лого × масштаб → px)
      var f = seg(p, .86, .9), ls = L.ls;
      for (var i = 0; i < strips.length; i++) {
        var Q = strips[i], t = E.o(seg(p, .55 + Q.k * .0045, .55 + Q.k * .0045 + .12));
        css(Q.el, 'transform', 'translate(' + px(Q.dx * (1 - t) * ls) + ',' + px(Q.dy * (1 - t) * ls) + ') rotate(' + (Q.rot + Q.da * (1 - t)).toFixed(2) + 'deg)');
        // до старта (t = 0) полоса лежит за пределами маски буквы (сдвиг ≥ 900 ед. при ширине буквы < 300) — невидима и так;
        // держим её «включённой» с начала, чтобы слои и маски были готовы заранее, а не в кадре, когда полосы пошли
        css(Q.el, 'opacity', f < 1 ? '1' : '0');
      }
      // 5) улыбка подъезжает под буквы: та же система координат → совпадение до пикселя
      var l = E.io(seg(p, .7, .86)), k = (L.ps + (L.ls - L.ps) * l) / L.ls;
      var X = L.px + (L.lx - L.px) * l - L.lx * k, Y = L.py + (L.ly - L.py) * l - L.ly * k;
      css(svgP, 'transform', 'translate(' + px(X) + ',' + px(Y) + ') scale(' + k.toFixed(5) + ')');
      // 6) финал: полосы → сплошные буквы, половинки → целая улыбка (без шва в клюве)
      // .002 вместо 0: невидимо (меньше полутона), но слои растрятся заранее, а не в первом кадре финала
      var fo = Math.max(.002, f).toFixed(3); css(svgL, 'opacity', fo); css(svgF, 'opacity', fo); css(svgP, 'opacity', (1 - f).toFixed(3));
      // подписи
      var ci = p < .3 ? 0 : p < .64 ? 1 : 2;
      caps.forEach(function (c, j) { c.classList.toggle('is-on', j === ci); });
    }
    return { layout: layout, apply: apply, measure: measure };
  }

  function story() {
    var host = $('.bs-story'); if (!host || axis('brand', 'sign') !== 'story') return;
    var frame = $('.bs-frame', host), svg = $('.bs-svg', frame);
    if (calm()) {
      // два статичных кадра: знак — и знак проигнорирован (лого собран)
      host.classList.add('is-static');
      var f2 = frame.cloneNode(true); host.appendChild(f2);
      var a = buildScene(svg), b = buildScene($('.bs-svg', f2)); if (!a || !b) return;
      var draw = function () {
        a.layout(frame.clientWidth, frame.clientHeight); a.apply(.04);
        b.layout(f2.clientWidth, f2.clientHeight); b.apply(1);
      };
      draw(); if (D.fonts && D.fonts.ready) D.fonts.ready.then(draw);
      W.addEventListener('resize', draw, { passive: true });
      M.story = { a: a, b: b };
      return;
    }
    var sc = buildScene(svg); if (!sc) return;
    var on = false, raf = 0, top = 0, span = 1, lastP = -1;
    function measure() {
      sc.layout(frame.clientWidth, frame.clientHeight);
      var r = host.getBoundingClientRect(); top = r.top + W.scrollY; span = Math.max(1, host.offsetHeight - frame.clientHeight);
      lastP = -1; tick();
    }
    function tick() { raf = 0; var p = clamp(0, 1, (W.scrollY - top) / span); if (Math.abs(p - lastP) < .0004) return; lastP = p; sc.apply(p); }
    W.addEventListener('scroll', function () { if (on && !raf) raf = requestAnimationFrame(tick); }, { passive: true });
    var rw = innerWidth, rh = innerHeight;
    W.addEventListener('resize', function () { if (innerWidth !== rw || Math.abs(innerHeight - rh) > 120) { rw = innerWidth; rh = innerHeight; measure(); } }, { passive: true });
    if ('IntersectionObserver' in W) new IntersectionObserver(function (es) { es.forEach(function (e) { on = e.isIntersecting; if (on) { measure(); } }); }, { rootMargin: '20% 0px' }).observe(host);
    else on = true;
    measure();
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(function () { sc.measure(); lastP = -1; tick(); });
    D.addEventListener('grinchin:ready', function () { setTimeout(measure, 60); });
    M.story = { scene: sc, seek: function (p) { sc.apply(p); }, measure: measure };
  }

  /* ================= 4. [data-reveal] ================= */
  function reveals() {
    var els = $$('[data-reveal]:not(.is-in)'); if (!els.length) return;
    if (calm() || !('IntersectionObserver' in W)) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }); }, { threshold: .2 });
    els.forEach(function (e) { io.observe(e); });
  }
  M.reveal = reveals;

  /* уборка следов игры v1 у тех, кто уже был на сайте */
  try { localStorage.removeItem('grinchin:gather:v1'); localStorage.removeItem('grinchin:gather:invited'); } catch (e) {}

  whenDom(function () {
    [heroAsphalt, marquee, story, reveals].forEach(function (f) { try { f(); } catch (e) { console.warn('[motion] ' + f.name, e); } });
  });
})();
