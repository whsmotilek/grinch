/* ================================================================
   GRINCHIN v2 · моушн (K4) → window.GV.motion
   Одна логика на весь сайт: линия → улыбка, стрелка → ухмылка.
   1. Прелоадер: точка → линия → улыбка → рожки → GRINCHIN → лого в шапку.
   2. Hero: заголовок встаёт вместе с раскрытием, «заданному» перечёркивается один раз.
   3. #progress: линия прокрутки под шапкой, к концу страницы прогибается в улыбку.
   4. .hd-cart-icon: пустая корзина — прямая, с товаром — улыбка, «чпок» на добавление.
   5. #sign-gesture: табличка ←→, стрелки гнутся в ухмылку и уплывают вниз (без слов).
   6. 404: GV.motion.play404(el) — перекладина STOP сжимается в линию и прогибается в улыбку.
   7. Появление блоков: opacity + translateY 14 px, один раз.
   Правила: на больших площадях только transform / opacity; морфы — по числам путей одинаковой
   структуры (точки не пересчитываются, форма не «выворачивается»); без своих rAF-циклов.
   ================================================================ */
(function () {
  'use strict';
  var D = document, H = D.documentElement, W = window;
  var GV = W.GV = W.GV || {};
  var M = GV.motion = GV.motion || {};
  M.isReady = false; M.loaderStarted = false;

  var G = W.gsap, ST = W.ScrollTrigger;
  if (G && ST) { try { G.registerPlugin(ST); ST.config({ ignoreMobileResize: true }); } catch (e) {} }

  var SHOT = H.dataset.shot === '1' || /[?&]shot=1/.test(location.search);
  var RMQ = W.matchMedia('(prefers-reduced-motion: reduce)');
  var calm = function () { return SHOT || RMQ.matches || !G; };
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- утилиты ---------- */
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };
  var cssVar = function (v, fb) { return getComputedStyle(H).getPropertyValue(v).trim() || fb; };
  var fire = function (n, d) { D.dispatchEvent(new CustomEvent(n, { detail: d })); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  function whenDom(fn) { if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn, { once: true }); else fn(); }

  // морф пути по числам: строки одинаковой структуры → функция t ∈ [0..1] → d
  var NUM = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
  function pathLerp(a, b) {
    var na = a.match(NUM).map(Number), nb = b.match(NUM).map(Number), parts = b.split(NUM);
    if (na.length !== nb.length) throw new Error('pathLerp: разная структура путей');
    return function (t) {
      var s = parts[0];
      for (var i = 0; i < na.length; i++) s += (+(na[i] + (nb[i] - na[i]) * t).toFixed(2)) + ' ' + parts[i + 1];
      return s;
    };
  }
  function rgb(c) { // '#00DB24' | 'rgb(…)' → [r,g,b]
    c = String(c).trim();
    if (c[0] === '#') { var h = c.slice(1); if (h.length === 3) h = h.replace(/./g, '$&$&'); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
    var m = c.match(/\d+(\.\d+)?/g); return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
  }
  function mix(a, b, t) { return 'rgb(' + a.map(function (v, i) { return Math.round(lerp(v, b[i], t)); }).join(',') + ')'; }
  function svgEl(tag, attrs, parent) { var e = D.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

  /* ---------- готовность ---------- */
  function ready() {
    if (M.isReady) return;
    M.isReady = true;
    if (H.getAttribute('data-loader') !== 'off') H.setAttribute('data-loader', 'done');
    fire('grinchin:ready');
    heroStrike();
  }

  /* ================= 1. ПРЕЛОАДЕР =================
     Полный 2,4 с, повтор в сессии 0,74 с, пропуск (клик/клавиша/колесо/свайп) доигрывает за ≤ 0,4 с.
     Раскрытие: чёрная крышка с мягким краем уезжает вниз (transform, композитор) — сайт проявляется сверху,
     шапка и голова модели первыми (в v1 круг из клюва давал «серую кляксу» и модель без головы), знак улетает в лого шапки (FLIP),
     заголовок hero встаёт одновременно — пустого hero нет. Перед раскрытием ждём картинку hero и шрифты
     (не дольше 1,2 с): иначе раскрылось бы пустое место или прыгнул шрифт. */
  function loader() {
    var mode = H.getAttribute('data-loader') || 'off', ld = $('#loader');
    if (!ld || mode === 'off' || calm()) {
      if (ld) ld.style.display = 'none';
      if (H.getAttribute('data-loader') !== 'off') H.setAttribute('data-loader', 'done');
      fire('grinchin:loader-progress', { t: 1, phase: 'done' });
      whenDom(ready);
      return;
    }
    M.loaderStarted = true;
    try { sessionStorage.setItem('gv-seen', '1'); } catch (e) {}
    var short = mode === 'short';
    var S = JSON.parse($('#gv-loader-shapes').textContent);
    var mk = $('.ld-mark', ld), cover = $('.ld-cover', ld), line = $('.ld-line', ld), horns = $$('.ld-horn', ld),
        lt = $('.ld-letters', ld), dot = $('.ld-dot', ld);
    var green = cssVar('--c-green', '#00DB24');
    var toBody = pathLerp(line.getAttribute('d'), S.body), toSmile = pathLerp(S.body, S.smile);
    var done = false, skipping = false, tl;

    fire('grinchin:loader-progress', { t: 0, phase: 'start' });   // K2: можно начинать import three

    function finish() {
      if (done) return; done = true;
      ['pointerdown', 'keydown', 'wheel', 'touchmove'].forEach(function (t) { W.removeEventListener(t, skip, true); });
      var l = $('#logo'); if (l) l.style.visibility = '';
      ld.style.display = 'none';
      H.setAttribute('data-loader', 'done');
      fire('grinchin:loader-progress', { t: 1, phase: 'done' });
      ready();
    }
    function skip(e) {
      if (!tl || done || skipping) return;
      if (e && e.type === 'keydown' && /^(Tab|Shift|Control|Alt|Meta)$/.test(e.key)) return;
      skipping = true; tl.pause();
      var rest = tl.duration() - tl.time();
      G.to(tl, { time: tl.duration(), duration: Math.min(.4, Math.max(.15, rest * .5)), ease: 'power1.inOut', onComplete: finish });
    }
    // куда садится знак: лого в шапке. Меряем один раз — в момент взлёта (шрифты и шапка уже на месте)
    var flip = null;
    function target() {
      if (flip) return flip;
      var a = mk.getBoundingClientRect(), l = $('#logo svg') || $('#logo'), b = l && l.getBoundingClientRect(), ok = b && b.width > 4;
      flip = { x: ok ? b.left - a.left : 0, y: ok ? b.top - a.top : -a.top, s: ok ? b.width / a.width : .2, col: ok ? getComputedStyle(l).color : green };
      return flip;
    }
    // ворота перед раскрытием: картинка hero и шрифты (максимум 1,2 с)
    function gate() {
      if (skipping) return;
      var img = $('#hero img'), waits = [];
      if (img && !img.complete) waits.push(new Promise(function (r) { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); }));
      if (D.fonts && D.fonts.status !== 'loaded') waits.push(D.fonts.ready);
      if (!waits.length) return;
      tl.pause();
      var go = function () { if (!skipping && !done && tl.paused()) tl.resume(); };
      Promise.race([Promise.all(waits), new Promise(function (r) { setTimeout(r, 1200); })]).then(go, go);
    }

    var t0 = short ? 0 : .25,   // точка → линия
        tM = short ? 0 : .7,    // линия провисает в «тело» улыбки
        tH = short ? 0 : 1.05,  // улыбка с рожками
        tL = short ? .05 : 1.3, // буквы — маской слева направо
        tF = short ? .3 : 1.8;  // FLIP в шапку + раскрытие
    var fd = short ? .42 : .55;
    var phase = function (t) { return t < tM ? 'line' : t < tL ? 'smile' : t < tF ? 'word' : 'reveal'; };
    tl = M.loaderTl = G.timeline({ paused: true, onComplete: finish,
      onUpdate: function () {
        var tt = tl.time(), d = { t: +tl.progress().toFixed(3), phase: phase(tt) };
        // точка рождения G для K2: клюв улыбки, в координатах окна (меряем один раз, до взлёта знака)
        if (!origin && tt >= tL && tt < tF) { var r = mk.getBoundingClientRect(); origin = { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height * .66) }; }
        if (origin) d.origin = origin;
        fire('grinchin:loader-progress', d);
      } });
    var origin = null;
    var morph = { b: 0, s: 0 };
    var paint = function () { line.setAttribute('d', morph.s > 0 ? toSmile(morph.s) : toBody(morph.b)); };
    if (!short) {
      tl.set(dot, { animation: 'none' }, 0)
        .to(dot, { autoAlpha: 0, scale: .5, duration: .25, ease: 'sine.in' }, t0)
        .fromTo(line, { opacity: 1, scaleX: .005, transformOrigin: '50% 50%' }, { scaleX: 1, duration: .5, ease: 'power3.inOut' }, t0)
        .to(morph, { b: 1, duration: .42, ease: 'power2.inOut', onUpdate: paint }, tM)
        .to(line, { fill: green, stroke: green, duration: .45, ease: 'sine.inOut' }, tM)
        .to(morph, { s: 1, duration: .35, ease: 'power2.out', onUpdate: paint }, tH)
        .fromTo(horns, { opacity: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: .32, ease: 'power1.inOut' }, tH)
        .to(horns, { opacity: 0, duration: .25, ease: 'sine.out' }, tH + .32);
    } else {
      // повтор в сессии: улыбка уже собрана, мягко проявляется вместе со словом
      morph.s = 1; paint();
      tl.set(line, { fill: green, stroke: green }, 0)
        .fromTo(line, { opacity: 0 }, { opacity: 1, duration: .2, ease: 'sine.out' }, 0);
    }
    // буквы: маска слева направо + посадка на 3 px. Никаких лент поверх знака.
    tl.fromTo(lt, { clipPath: 'inset(-20% 100% -20% 0%)', y: short ? 0 : 3 },
                  { clipPath: 'inset(-20% 0% -20% 0%)', y: 0, duration: short ? .3 : .5, ease: 'power2.inOut' }, tL)
      .call(gate, null, tF);
    // раскрытие: знак — в шапку, крышка гаснет, заголовок hero встаёт
    tl.to(mk, { x: function () { return target().x; }, y: function () { return target().y; }, scale: function () { return target().s; },
                duration: fd, ease: 'power3.inOut' }, tF)
      .to([lt, line], { color: function () { return target().col; }, fill: function () { return target().col; }, stroke: 'rgba(0,0,0,0)', duration: fd, ease: 'sine.inOut' }, tF)
      .to(cover, { yPercent: 100, duration: fd + .05, ease: 'power2.inOut' }, tF);
    var ht = $('#hero-title');
    if (ht) tl.fromTo(ht, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: short ? .36 : .5, ease: 'power2.out', clearProps: 'transform,opacity,visibility' }, tF + .08);
    // лого в шапке проявляется ровно в кадр посадки — подмена незаметна (боксы совпадают пиксель в пиксель)
    tl.call(function () { var l = $('#logo'); if (l) l.style.visibility = 'visible'; ld.style.display = 'none'; }, null, tF + fd);

    ['pointerdown', 'keydown', 'wheel', 'touchmove'].forEach(function (t) { W.addEventListener(t, skip, { capture: true, passive: true }); });
    setTimeout(function () { if (!done) skip(); }, 7000);   // страховка от зависания
    // старт — со следующего кадра: точка к этому моменту уже на экране (CSS до JS)
    whenDom(function () { requestAnimationFrame(function () { tl.play(); }); });
  }

  /* ================= 2. HERO: перечёркивание ================= */
  function strikeEl() { return $('#hero .hero-strike') || $('#hero .ht-strike'); }
  function heroStrikeBuild() {
    var s = strikeEl(); if (!s || $('.mx-strike', s)) return;
    s.classList.add('mx-strike-host');
    var svg = svgEl('svg', { 'class': 'mx-strike', viewBox: '0 0 100 10', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' }, s);
    // линия от руки: слегка поднимается к концу, без зигзагов
    svgEl('path', { d: 'M0 6.4C28 6 62 4.9 100 3.6' }, svg);
    if (calm()) s.classList.add('is-drawn');
  }
  function heroStrike() {
    var s = strikeEl(); if (!s) return;
    heroStrikeBuild();
    if (calm()) { s.classList.add('is-drawn'); return; }
    // один раз, после раскрытия: слово успевают прочитать, потом его зачёркивают
    setTimeout(function () { s.classList.add('is-drawn'); }, H.getAttribute('data-loader') === 'off' ? 300 : 150);
  }

  /* ================= 3. ПРОГРЕСС ================= */
  function progress() {
    var host = $('#progress'); if (!host || host.firstChild) return;
    var svg = svgEl('svg', { viewBox: '0 0 1000 16', preserveAspectRatio: 'none', focusable: 'false' }, host);
    var path = svgEl('path', { d: 'M0 1Q500 1 1000 1' }, svg);
    var lastS = -1, lastP = -1;
    function set(p) {
      // до 90 % — только scaleX (композитор). Последние 10 % — прогиб в улыбку (маленькая перерисовка 16 px по высоте)
      var s = Math.max(0, (p - .9) / .1); s = s * s * (3 - 2 * s);
      if (Math.abs(s - lastS) > .002) { path.setAttribute('d', 'M0 1Q500 ' + (1 + 18 * s).toFixed(2) + ' 1000 1'); lastS = s; }
      if (Math.abs(p - lastP) > .0002) { svg.style.transform = 'scaleX(' + p.toFixed(4) + ')'; lastP = p; }
    }
    set(0);
    ST.create({ start: 0, end: 'max', onUpdate: function (self) { set(self.progress); }, onRefresh: function (self) { set(self.progress); } });
  }

  /* ================= 4. ИКОНКА КОРЗИНЫ ================= */
  var CART_FLAT = 'M3 8L6 8C11 8 16 8 20 8C24 8 29 8 34 8L37 8';
  var CART_SMILE = 'M5.4 1.2L7.2 7C11.5 10.8 16 11 20 13.6C24 11 28.5 10.8 32.8 7L34.6 1.2';
  var cart = null;
  function cartIcon() {
    var host = $('#header .hd-cart-icon') || $('.hd-cart-icon'); if (!host || (cart && cart.host === host)) return;
    host.innerHTML = '';
    var svg = svgEl('svg', { viewBox: '0 0 40 16', focusable: 'false', 'aria-hidden': 'true' }, host);
    var path = svgEl('path', { d: CART_FLAT }, svg);
    var n0 = $('#header [data-cart-count]'); n0 = n0 ? parseInt(n0.textContent, 10) || 0 : 0;
    cart = { host: host, svg: svg, path: path, f: pathLerp(CART_FLAT, CART_SMILE), v: { t: n0 > 0 ? 1 : 0 } };
    path.setAttribute('d', cart.f(cart.v.t));
    host.classList.toggle('is-full', n0 > 0);
  }
  function cartSet(full) {
    if (!cart) cartIcon(); if (!cart) return;
    cart.host.classList.toggle('is-full', full);
    var to = full ? 1 : 0; if (cart.v.t === to) return;
    if (calm()) { cart.v.t = to; cart.path.setAttribute('d', cart.f(to)); return; }
    G.to(cart.v, { t: to, duration: full ? .42 : .3, ease: full ? 'back.out(2.2)' : 'power2.inOut', overwrite: true,
      onUpdate: function () { cart.path.setAttribute('d', cart.f(cart.v.t)); } });
  }
  D.addEventListener('grinchin:cart', function (e) { cartSet(((e.detail && +e.detail.count) || 0) > 0); });
  D.addEventListener('grinchin:add', function () {
    if (!cart) cartIcon(); if (!cart || calm()) return;
    // «чпок»: короткий подскок иконки
    G.fromTo(cart.svg, { scale: 1, y: 0 }, { keyframes: [{ scale: 1.28, y: -2, duration: .12, ease: 'power2.out' }, { scale: 1, y: 0, duration: .3, ease: 'back.out(2.4)' }],
      transformOrigin: '50% 60%', overwrite: true, clearProps: 'transform' });
  });

  /* ================= 5. ЖЕСТ «СТРЕЛКИ → УХМЫЛКА» =================
     Табличка ←→ как id_06. Стрелка — штрих одной структуры: древко-кривая + наконечник-«галочка».
     Древко провисает к центру, концы поднимаются, наконечники поворачиваются вверх и становятся рожками.
     Вся геометрия — функция одного параметра p, поэтому морф не может «вывернуться». */
  var VB_W = 1854;
  var ARROW = { // левая стрелка; правая — зеркально по x
    a: { I: [842, 200], c1: [640, 200], c2: [420, 200], T: [178, 200], th: -Math.PI, L: 118, L2: 118, al: 40, w: 40 },
    b: { I: [927, 322], c1: [770, 238], c2: [390, 262], T: [212, 116], th: Math.atan2(116 - 262, 212 - 390), L: 34, L2: 100, al: 24, w: 34 }   // наконечник → крюк рожка, как в лого
  };
  function arrowD(p, mirror) {
    var A = ARROW.a, B = ARROW.b, q = function (k) { return [lerp(A[k][0], B[k][0], p), lerp(A[k][1], B[k][1], p)]; };
    var I = q('I'), c1 = q('c1'), c2 = q('c2'), T = q('T'), th = lerp(A.th, B.th, p), L = lerp(A.L, B.L, p), al = lerp(A.al, B.al, p) * Math.PI / 180;
    var back = th + Math.PI, b1 = [T[0] + L * Math.cos(back - al), T[1] + L * Math.sin(back - al)], L2 = lerp(A.L2, B.L2, p), b2 = [T[0] + L2 * Math.cos(back + al), T[1] + L2 * Math.sin(back + al)];
    var X = function (pt) { return (mirror ? VB_W - pt[0] : pt[0]).toFixed(1) + ' ' + pt[1].toFixed(1); };
    return 'M' + X(I) + 'C' + X(c1) + ' ' + X(c2) + ' ' + X(T) + 'M' + X(b1) + 'L' + X(T) + 'L' + X(b2);
  }
  M.arrowD = arrowD;
  function signSVG(cls) {
    var wrap = D.createElement('div'); wrap.className = 'sg-sign' + (cls ? ' ' + cls : '');
    var plate = svgEl('svg', { 'class': 'sg-plate', viewBox: '0 0 1854 390', focusable: 'false', 'aria-hidden': 'true' }, wrap);
    svgEl('rect', { 'class': 'sg-plate-bg', x: 6, y: 46, width: 1842, height: 308, rx: 36 }, plate);
    svgEl('rect', { 'class': 'sg-plate-rim', x: 34, y: 74, width: 1786, height: 252, rx: 18 }, plate);
    var mark = svgEl('svg', { 'class': 'sg-mark', viewBox: '0 0 1854 390', focusable: 'false', 'aria-hidden': 'true' }, wrap);
    var l = svgEl('path', { 'class': 'sg-arrow' }, mark), r = svgEl('path', { 'class': 'sg-arrow' }, mark);
    return { wrap: wrap, plate: plate, mark: mark, paths: [l, r] };
  }
  function gesture() {
    var host = $('#sign-gesture'); if (!host || host._sg) return;
    host._sg = 1;
    var ink = rgb(cssVar('--c-black', '#000')), green = rgb(cssVar('--c-green', '#00DB24'));
    function pose(sg, p, c) {
      var col = mix(ink, green, c), w = lerp(ARROW.a.w, ARROW.b.w, p);
      sg.paths.forEach(function (el, i) { el.setAttribute('d', arrowD(p, i === 1)); el.style.stroke = col; el.style.strokeWidth = w; });
    }
    var box = D.createElement('div'); box.className = 'sg';
    host.innerHTML = ''; host.appendChild(box);
    var stage = D.createElement('div'); stage.className = 'sg-stage'; box.appendChild(stage);

    if (calm() || !ST) {   // статичная пара кадров: табличка → ухмылка на табличке (как id_06)
      box.setAttribute('data-mode', 'static');
      var a = signSVG(), b = signSVG();
      pose(a, 0, 0); pose(b, 1, 1);
      stage.appendChild(a.wrap); stage.appendChild(b.wrap);
      return;
    }
    var sg = signSVG(); stage.appendChild(sg.wrap);
    var st = { p: 0, c: 0 };
    var draw = function () { pose(sg, st.p, st.c); };
    draw();
    G.matchMedia().add({ wide: '(min-width: 1024px)', narrow: '(max-width: 1023.98px)' }, function (ctx) {
      st.p = 0; st.c = 0; draw();
      G.set([sg.plate, sg.mark], { clearProps: 'all' });
      if (ctx.conditions.wide) {
        // desktop: короткий скраб < 1 экрана. «Пин» — CSS sticky (высота зарезервирована в CSS → CLS 0).
        // Если предок режет overflow (sticky не работает) — тот же отрезок держит ScrollTrigger без spacer.
        box.setAttribute('data-mode', 'scrub');
        var stickyOK = true;
        for (var n = host.parentElement; n && n !== D.body; n = n.parentElement) {
          var o = getComputedStyle(n); if (/(hidden|auto|scroll)/.test(o.overflowX + ' ' + o.overflowY)) { stickyOK = false; break; }
        }
        box.setAttribute('data-pin', stickyOK ? 'css' : 'st');
        var tl = G.timeline({ defaults: { ease: 'none' } });
        tl.to(st, { p: 1, duration: .42, ease: 'power2.inOut', onUpdate: draw }, .04)
          .to(st, { c: 1, duration: .28, ease: 'sine.inOut', onUpdate: draw }, .14)
          .to(sg.plate, { opacity: 0, scale: .985, duration: .16, ease: 'sine.in' }, .34)
          .to(sg.mark, { y: function () { return innerHeight * .3; }, scale: .8, duration: .5, ease: 'power1.inOut' }, .5)
          .to(sg.mark, { opacity: 0, duration: .12, ease: 'sine.in' }, .88);
        var hdr = function () { var h = $('#header'), s = $('#status'); return 'top top+=' + Math.round((h ? h.offsetHeight : 0) + (s ? s.offsetHeight : 0)); };
        var trig = ST.create({ trigger: host, start: 'top 40%', end: 'bottom bottom', scrub: .5, animation: tl, invalidateOnRefresh: true });
        var pin = stickyOK ? null : ST.create({ trigger: host, start: hdr, end: 'bottom bottom', pin: stage, pinSpacing: false });
        return function () { trig.kill(); if (pin) pin.kill(); tl.kill(); };
      }
      // телефон/планшет: без пина. Жест проигрывается один раз при входе в зону, ухмылка остаётся.
      box.setAttribute('data-mode', 'play'); box.removeAttribute('data-pin');
      var pl = G.timeline({ paused: true });
      pl.to(st, { p: 1, duration: .9, ease: 'power2.inOut', onUpdate: draw }, .1)
        .to(st, { c: 1, duration: .55, ease: 'sine.inOut', onUpdate: draw }, .3)
        .to(sg.plate, { opacity: 0, scale: .985, duration: .45, ease: 'sine.in' }, .75)
        .to(sg.mark, { y: function () { return Math.min(innerHeight * .06, 48); }, duration: .7, ease: 'power2.inOut' }, 1.0);
      var once = ST.create({ trigger: host, start: 'top 70%', once: true, onEnter: function () { pl.play(); } });
      return function () { once.kill(); pl.kill(); };
    });
  }

  /* ================= 6. 404 =================
     Разметка K5: [data-404-sign] > svg с .st-bar (перекладина) и .st-smile (улыбка — итоговый кадр).
     Перекладина = толстый штрих по «плоской» улыбке (та же структура команд, что у .st-smile) →
     сжимается в линию → провисает → прогибается в улыбку с рожками и заливается.
     В конце снимаем .is-playing — остаётся статичная .st-smile K5, кадр в кадр. */
  M.play404 = function (el) {
    el = el && (el.nodeType ? el : $(el)); if (!el) return;
    var bar = $('.st-bar', el), smile = $('.st-smile', el), sign = $('svg', el);
    if (el._p404) { el._p404.kill(); el._p404 = null; }
    if (!bar || !smile) { el.classList.remove('is-playing'); return; }
    if (bar._d0 == null) bar._d0 = bar.getAttribute('d');
    var reset = function () { if (G) G.set(bar, { clearProps: 'all' }); bar.setAttribute('d', bar._d0); ['style', 'transform', 'data-svg-origin'].forEach(function (a) { bar.removeAttribute(a); }); if (sign && G) G.set(sign, { clearProps: 'transform' }); };
    var flat = $('#loader .ld-line'), S = null;
    try { S = JSON.parse($('#gv-loader-shapes').textContent); } catch (e) {}
    if (calm() || !flat || !S) { reset(); el.classList.remove('is-playing'); return; }
    // «плоская» улыбка той же длины, что перекладина K5 (120…1734): относительные x сжаты к центру 927
    var k = 807 / 904, i = 0;
    var FLAT = flat.getAttribute('d').replace(/^M927 195/, 'M927 250').replace(NUM, function (n) { i++; return i > 2 && i % 2 === 1 ? String(+(n * k).toFixed(2)) : n; });
    var toBody = pathLerp(FLAT, S.body), toSmile = pathLerp(S.body, smile.getAttribute('d'));
    var col = getComputedStyle(smile).fill || '#000';
    var m = { b: 0, s: 0 }, paint = function () { bar.setAttribute('d', m.s > 0 ? toSmile(m.s) : toBody(m.b)); };
    el.classList.add('is-playing');
    G.set(bar, { scaleY: 1, transformOrigin: '50% 50%' });
    var tl = G.timeline({ delay: .35, onComplete: function () { el.classList.remove('is-playing'); reset(); el._p404 = null; } });
    tl.to(bar, { scaleY: .1, duration: .24, ease: 'power2.in' })                                      // перекладина сжимается в линию
      .call(function () { G.set(bar, { scaleY: 1, attr: { d: FLAT }, fill: 'rgba(0,0,0,0)', stroke: col, strokeWidth: 20, strokeLinejoin: 'round' }); })
      .to(m, { b: 1, duration: .3, ease: 'power2.inOut', onUpdate: paint }, '+=.05')                  // провисает
      .to(bar, { fill: col, strokeWidth: 0, duration: .3, ease: 'sine.inOut' }, '<')
      .to(m, { s: 1, duration: .34, ease: 'back.out(1.8)', onUpdate: paint }, '-=.04');               // рожки — улыбка
    if (sign) tl.fromTo(sign, { rotation: 0 }, { keyframes: [{ rotation: -3, duration: .16, ease: 'power2.out' }, { rotation: 0, duration: .5, ease: 'back.out(3)' }],
      transformOrigin: '50% 100%' }, '-=.3');
    el._p404 = tl;
  };

  /* ================= 7. ПОЯВЛЕНИЕ БЛОКОВ =================
     Один раз, opacity + translateY 14 px, без задержек на чтение. Свой блок можно включить атрибутом [data-reveal]. */
  var REVEAL = '[data-reveal], #drop .drop-head, #drop .card, #looks .look, #next .nx-grid > *';
  var revealIO = null, seen = typeof WeakSet === 'function' ? new WeakSet() : null;
  function reveals() {
    if (calm() || !('IntersectionObserver' in W) || !seen) return;
    if (!revealIO) revealIO = new IntersectionObserver(function (es) {
      var batch = es.filter(function (e) { return e.isIntersecting; }).map(function (e) { revealIO.unobserve(e.target); return e.target; });
      if (batch.length) G.to(batch, { autoAlpha: 1, y: 0, duration: .5, ease: 'power2.out', stagger: Math.min(.06, .3 / batch.length), clearProps: 'transform,opacity,visibility' });
    }, { rootMargin: '0px 0px -6% 0px' });
    var vh = innerHeight;
    $$(REVEAL).forEach(function (el) {
      if (seen.has(el) || el.closest('[role="dialog"], #sign-gesture')) return;
      seen.add(el);
      if (el.getBoundingClientRect().top < vh * .94) return;   // уже на экране — не прячем
      G.set(el, { autoAlpha: 0, y: 14 });
      revealIO.observe(el);
    });
  }

  /* ================= запуск ================= */
  try { loader(); } catch (e) { console.warn('[motion] loader', e); var l0 = $('#loader'); if (l0) l0.style.display = 'none'; H.setAttribute('data-loader', 'done'); whenDom(ready); }
  whenDom(function () {
    try { heroStrikeBuild(); } catch (e) { console.warn('[motion] strike', e); }
    try { cartIcon(); } catch (e) { console.warn('[motion] cart', e); }
    try { gesture(); } catch (e) { console.warn('[motion] gesture', e); }
    if (!G || !ST) return;
    try { progress(); } catch (e) { console.warn('[motion] progress', e); }
    try { reveals(); } catch (e) { console.warn('[motion] reveals', e); }
    // карточки дропа рисует K1 — подхватываем ещё раз после загрузки и после прелоадера
    W.addEventListener('load', function () { try { reveals(); } catch (e) {} }, { once: true });
    D.addEventListener('grinchin:ready', function () { try { reveals(); } catch (e) {} }, { once: true });
    // пересчёт позиций — когда шрифты на месте (картинки с явными размерами layout не двигают; load ScrollTrigger ловит сам)
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(function () { ST.refresh(); });
  });
  M.refresh = function () { if (ST) ST.refresh(); try { reveals(); } catch (e) {} };
})();
