/* ================================================================
   GRINCHIN v2 · моушн (K4) → window.GV.motion
   Одна логика на весь сайт: линия → улыбка.
   0. Прелоадер — в loader.html (свой rAF-таймлайн, стартует с первой отрисовки, без GSAP).
   1. Hero: «заданному» перечёркивается один раз после раскрытия.
   2. #progress: линия прокрутки под шапкой, к концу страницы прогибается в улыбку.
   3. .hd-cart-icon: пакет; пустой — на нём прямая, с товаром — улыбка; «чпок» на добавление.
   4. #door-smile: улыбку из ленты «приклеивают» под буквы на фото двери (один раз, ~0,9 с, без пина).
   5. 404: GV.motion.play404(el) — перекладина STOP сжимается в линию и прогибается в улыбку.
   6. Появление блоков: только opacity + translateY 14 px, один раз (без visibility — Tab не теряет блоки).
   Правила: на больших площадях только transform / opacity; морфы — по числам путей одинаковой
   структуры (точки не пересчитываются, форма не «выворачивается»); без своих rAF-циклов.
   ================================================================ */
(function () {
  'use strict';
  var D = document, H = D.documentElement, W = window;
  var GV = W.GV = W.GV || {};
  var M = GV.motion = GV.motion || {};
  M.isReady = false;

  var G = W.gsap, ST = W.ScrollTrigger;
  if (G && ST) { try { G.registerPlugin(ST); ST.config({ ignoreMobileResize: true }); } catch (e) {} }

  var SHOT = H.dataset.shot === '1' || /[?&]shot=1/.test(location.search);
  var RMQ = W.matchMedia('(prefers-reduced-motion: reduce)');
  var calm = function () { return SHOT || RMQ.matches || !G; };
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- утилиты ---------- */
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };
  var fire = function (n, d) { D.dispatchEvent(new CustomEvent(n, { detail: d })); };
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
  function svgEl(tag, attrs, parent) { var e = D.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

  /* ---------- готовность: grinchin:ready шлёт прелоадер (loader.html) ---------- */
  function onReady() {
    if (M.isReady) return;
    M.isReady = true;
    try { heroStrike(); } catch (e) { console.warn('[motion] strike', e); }
    try { reveals(); } catch (e) {}
  }

  /* ================= 1. HERO: перечёркивание ================= */
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

  /* ================= 2. ПРОГРЕСС ================= */
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

  /* ================= 3. ИКОНКА КОРЗИНЫ =================
     Пакет (понятно без подписи на телефоне), на нём та же механика: пусто — прямая, есть товар — улыбка с рожками. */
  var CART_BAG = 'M4.6 8.2h14.8l-1.1 12.3H5.7zM8.8 8.2V6.6a3.2 3.2 0 0 1 6.4 0v1.6';
  var CART_FLAT = 'M7.6 14.6L8.8 14.6C10.2 14.6 11.2 14.6 12 14.6C12.8 14.6 13.8 14.6 15.2 14.6L16.4 14.6';
  var CART_SMILE = 'M7.4 12.4L8.3 14C9.8 15.4 11 15.5 12 16.4C13 15.5 14.2 15.4 15.7 14L16.6 12.4';
  var cart = null;
  function cartIcon() {
    var host = $('#header .hd-cart-icon') || $('.hd-cart-icon'); if (!host || (cart && cart.host === host)) return;
    host.innerHTML = '';
    var svg = svgEl('svg', { viewBox: '0 0 24 24', focusable: 'false', 'aria-hidden': 'true' }, host);
    svgEl('path', { 'class': 'ci-bag', d: CART_BAG }, svg);
    var path = svgEl('path', { 'class': 'ci-mouth', d: CART_FLAT }, svg);
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

  /* ================= 4. УЛЫБКА НА ДВЕРИ =================
     #door-smile (K3: оверлей из ленты внутри фигуры двери, позиция в % от кадра под буквами).
     При входе двери в экран улыбку «приклеивают»: лента разворачивается слева направо (clip-path)
     и садится — чуть приподнята и повёрнута → прижата; тень (.ds-shadow, если есть) проявляется на посадке.
     Один раз, ~0,9 с, без пина. reduced-motion и ?shot=1 — сразу на месте. Нет элемента — ничего не делаем. */
  function doorSmile() {
    var el = $('#door-smile'); if (!el || el._ds) return;
    el._ds = 1;
    if (calm()) return;   // статично: элемент стоит как его поставил K3
    var sh = $('.ds-shadow', el);
    var shown = false;
    var play = function () {
      if (shown) return; shown = true;
      var tl = G.timeline({ onComplete: function () { G.set(el, { clearProps: 'clipPath,transform' }); if (sh) G.set(sh, { clearProps: 'opacity' }); } });
      tl.to(el, { clipPath: 'inset(-25% -4% -25% 0%)', duration: .62, ease: 'power2.inOut' }, 0)                 // развёртка слева направо
        .to(el, { y: 0, rotation: 0, scale: 1, duration: .38, ease: 'power3.out' }, .5);                         // посадка
      if (sh) tl.to(sh, { opacity: 1, duration: .3, ease: 'sine.out' }, .55);
    };
    var r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0 && M.isReady) return;   // уже на экране (перезагрузка посреди страницы) — не прячем
    G.set(el, { clipPath: 'inset(-25% 100% -25% 0%)', y: -5, rotation: -1.2, scale: 1.015, transformOrigin: '0% 50%' });
    if (sh) G.set(sh, { opacity: 0 });
    var host = el.closest('figure') || el;
    if (!('IntersectionObserver' in W)) { play(); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting && M.isReady) { io.disconnect(); setTimeout(play, 120); } });
    }, { threshold: .45 });
    io.observe(host);
    D.addEventListener('grinchin:ready', function () { io.disconnect(); io.observe(host); }, { once: true });
  }

  /* ================= 5. 404 =================
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

  /* ================= 6. ПОЯВЛЕНИЕ БЛОКОВ =================
     Один раз, opacity + translateY 14 px, без задержек на чтение. Только opacity/transform — visibility не трогаем:
     скрытый visibility-блок не получает фокус, и Tab перескакивал дроп, образы и подписку.
     Фокус внутри ещё не показанного блока показывает его сразу. Свой блок можно включить атрибутом [data-reveal]. */
  var REVEAL = '[data-reveal], #drop .drop-head, #drop .card, #looks .look, #next .nx-grid > *';
  var revealIO = null, seen = typeof WeakSet === 'function' ? new WeakSet() : null, pending = [];
  function show(els) {
    els = els.filter(function (el) { var k = pending.indexOf(el); if (k < 0) return false; pending.splice(k, 1); revealIO.unobserve(el); return true; });
    if (els.length) G.to(els, { opacity: 1, y: 0, duration: .5, ease: 'power2.out', stagger: Math.min(.06, .3 / els.length), overwrite: true, clearProps: 'transform,opacity' });
  }
  function reveals() {
    if (calm() || !('IntersectionObserver' in W) || !seen) return;
    if (!revealIO) {
      revealIO = new IntersectionObserver(function (es) {
        show(es.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; }));
      }, { rootMargin: '0px 0px -6% 0px' });
      D.addEventListener('focusin', function (e) {
        for (var i = 0; i < pending.length; i++) if (pending[i].contains(e.target)) { G.killTweensOf(pending[i]); G.set(pending[i], { clearProps: 'transform,opacity' }); show([pending[i]]); break; }
      });
    }
    var vh = innerHeight;
    $$(REVEAL).forEach(function (el) {
      if (seen.has(el) || el.closest('[role="dialog"]')) return;
      seen.add(el);
      if (el.getBoundingClientRect().top < vh * .94) return;   // уже на экране — не прячем
      G.set(el, { opacity: 0, y: 14 });
      pending.push(el);
      revealIO.observe(el);
    });
  }

  /* ================= запуск ================= */
  whenDom(function () {
    try { heroStrikeBuild(); } catch (e) { console.warn('[motion] strike', e); }
    try { cartIcon(); } catch (e) { console.warn('[motion] cart', e); }
    if (G && ST) {
      try { progress(); } catch (e) { console.warn('[motion] progress', e); }
      try { reveals(); } catch (e) { console.warn('[motion] reveals', e); }
      try { doorSmile(); } catch (e) { console.warn('[motion] door', e); }
      // карточки дропа рисует K1 — подхватываем ещё раз после загрузки
      W.addEventListener('load', function () { try { reveals(); } catch (e) {} }, { once: true });
      // пересчёт позиций — когда шрифты на месте (картинки с явными размерами layout не двигают; load ScrollTrigger ловит сам)
      if (D.fonts && D.fonts.ready) D.fonts.ready.then(function () { ST.refresh(); });
    }
    if (H.getAttribute('data-ready') === '1') onReady();
  });
  D.addEventListener('grinchin:ready', onReady, { once: true });
  // без прелоадера в разметке (чужая страница, ошибка) — ready шлём сами
  if (!GV.loader) whenDom(function () { setTimeout(function () { if (!M.isReady) fire('grinchin:ready'); }, 0); });
  M.refresh = function () { if (ST) ST.refresh(); try { reveals(); } catch (e) {} };
})();
