/* ================================================================
   GRINCHIN · моушн-слой (агент B) → window.GV.motion
   Лоадер · лента (переходы, бейджи, образы, бегущая, отрывная) ·
   ч/б→цвет · история лого · маскот «Ухмыл» · микро.
   Работает и без разметки соседей: всё ищется по хукам из CONTRACT.md,
   новые узлы подхватываются MutationObserver'ом.
   ================================================================ */
(function () {
  'use strict';
  var D = document, H = D.documentElement, W = window;
  var GV = W.GV = W.GV || {};
  var G = W.gsap;
  var ST = W.ScrollTrigger, MORPH = W.MorphSVGPlugin, DRAW = W.DrawSVGPlugin, DRAG = W.Draggable;
  if (G) { try { G.registerPlugin.apply(G, [ST, MORPH, DRAW, DRAG].filter(Boolean)); } catch (e) {} }

  var SHOT = H.dataset.shot === '1' || /[?&]shot=1/.test(location.search);
  var RMQ = W.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = function () { return RMQ.matches; };
  var calm = function () { return SHOT || reduced() || !G; };     // «без движения»
  var FINE = W.matchMedia('(hover: hover) and (pointer: fine)');
  var NS = 'http://www.w3.org/2000/svg';
  H.classList.add('mx-js');

  /* ---------- утилиты ---------- */
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };
  var css = function (v) { return getComputedStyle(H).getPropertyValue(v).trim(); };
  var clamp = function (a, b, v) { return Math.max(a, Math.min(b, v)); };
  var fire = function (n, d) { D.dispatchEvent(new CustomEvent(n, { detail: d })); };
  var mark = function (el, k) { if (el['_mx' + k]) return false; el['_mx' + k] = 1; return true; };
  function rnd(seed) { var s = 0; seed = String(seed); for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) | 0; return function () { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) % 10000) / 10000; }; }
  function io(cb, opt) { return 'IntersectionObserver' in W ? new IntersectionObserver(function (es) { es.forEach(cb); }, opt) : { observe: function (el) { cb({ target: el, isIntersecting: true }); }, unobserve: function () {} }; }
  function svgEl(tag, attrs, parent) { var e = D.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

  var SH = null;   // формы улыбки/стрелок — из loader.html (#mx-shapes), иначе из лого в шапке
  function shapes() {
    if (SH) return SH;
    try { SH = JSON.parse($('#mx-shapes').textContent); } catch (e) { SH = {}; }
    if (!SH.smile) { var p = $('#logo .lg-smile'); SH.smile = p ? p.getAttribute('d') : ''; }
    return SH;
  }

  /* ---------- ЛЕНТА: материал ---------- */
  // рваные концы — свои у каждого куска
  function edge(r) {
    var L = [], R = [], n = 6, i;
    for (i = 0; i <= n; i++) R.push('calc(100% - ' + (r() * 6).toFixed(1) + 'px) ' + (i * 100 / n).toFixed(1) + '%');
    for (i = n; i >= 0; i--) L.push((r() * 6).toFixed(1) + 'px ' + (i * 100 / n).toFixed(1) + '%');
    return 'polygon(' + R.concat(L).join(',') + ')';
  }
  function makeTape(text, opt) {
    opt = opt || {};
    var w = D.createElement('div'), t = D.createElement('div'), s = D.createElement('span');
    w.className = 'tp-w' + (opt.cls ? ' ' + opt.cls : '');
    t.className = 'tp' + (opt.tone ? ' tp--' + opt.tone : '');
    if (opt.edge !== false) t.style.setProperty('--tp-clip', edge(rnd(text + (opt.seed || ''))));
    s.className = 'tp-txt';
    s.textContent = opt.raw ? text : Array(opt.repeat || 6).join(text + '  ');
    t.appendChild(s); w.appendChild(t);
    w.setAttribute('aria-hidden', 'true');
    return w;
  }

  /* ---------- готовность ---------- */
  var M = GV.motion = { isReady: false, makeTape: makeTape };
  function ready() {
    if (M.isReady) return;
    M.isReady = true;
    if (H.getAttribute('data-loader') !== 'off') H.setAttribute('data-loader', 'done');
    fire('grinchin:ready');
    heroTitle();
  }
  function whenDom(fn) { if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn, { once: true }); else setTimeout(fn, 0); }

  /* ================= 1. ЛОАДЕР ================= */
  function loader() {
    var mode = H.getAttribute('data-loader') || 'off', ld = $('#loader');
    if (!ld || mode === 'off' || calm() || !MORPH) { H.setAttribute('data-loader', mode === 'off' ? 'off' : 'done'); whenDom(ready); return; }
    try { sessionStorage.setItem('gv-seen', '1'); } catch (e) {}
    var S = shapes(), mk = $('.ld-mark', ld), line = $('.ld-line', ld), horns = $$('.ld-horn', ld),
        smile = $('.ld-smile', ld), lt = $('.ld-letters', ld), tbox = $('.ld-tape', ld), dot = $('.ld-dot', ld),
        cap = $('.ld-cap', ld), grain = $('.ld-grain', ld), short = mode === 'short';
    var green = css('--c-green') || '#00DB24', white = css('--c-white') || '#fff';
    tbox.appendChild(makeTape('GRINCHIN', { repeat: 4, seed: 'ld', tone: 'brand' }));
    var tape = tbox.firstChild, rev = { p: 0 };
    var beak = S.beak || [927, 388];
    var done = false, tl;
    function finish() {
      if (done) return; done = true;
      ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (t) { W.removeEventListener(t, skip, true); });
      H.setAttribute('data-loader', 'done');
      ld.style.display = 'none';
      ready();
    }
    function skip() { if (!tl || done || skip.on) return; skip.on = 1; tl.pause(); G.to(tl, { progress: 1, duration: .4, ease: 'power2.inOut', onComplete: finish }); }
    // FLIP: куда уезжает знак (лого в шапке), считаем в момент старта шага
    var flip = null;
    function target() {
      if (flip) return flip;
      var a = mk.getBoundingClientRect(), l = $('#logo svg') || $('#logo'), b = l && l.getBoundingClientRect();
      var ok = b && b.width > 4;
      flip = { x: ok ? b.left - a.left : 0, y: ok ? b.top - a.top : -40, s: ok ? b.width / a.width : .6, ok: ok,
               bx: a.left + a.width * beak[0] / 1854, by: a.top + a.height * beak[1] / 390,
               R: Math.hypot(innerWidth, innerHeight) * 1.15,
               col: ok ? getComputedStyle(l).color : green };
      return flip;
    }
    G.set(line, { transformOrigin: '50% 50%' });
    G.set(horns, { drawSVG: '0%' });
    // итерация 2: медленнее и спокойнее — каждый шаг читается, без вспышек и резких смен цвета;
    // мягкие кривые (sine/power2), пауза-«вдох» на готовой улыбке, лента идёт ~0,75 с. Полный ≈ 3,1 с, повтор ≈ 1,2 с.
    tl = M.loaderTl = G.timeline({ paused: true, onComplete: finish, defaults: { overwrite: 'auto' } });
    var t0 = short ? 0 : .35;               // точка → линия
    var tM = short ? 0 : .95;               // прогиб в «тело» улыбки
    var tH = short ? .2 : 1.45;             // улыбка + рожки
    var tT = short ? .45 : 1.95;            // лента
    var tF = short ? .78 : 2.68;            // FLIP + раскрытие
    if (!short) {
      tl.fromTo(cap, { autoAlpha: 0 }, { autoAlpha: .8, duration: .6, ease: 'sine.out' }, .2)
        .to(dot, { autoAlpha: 0, scale: .6, duration: .3, ease: 'sine.in' }, t0)
        .fromTo(line, { opacity: 1, scaleX: .004 }, { scaleX: 1, duration: .6, ease: 'power2.inOut' }, t0)
        .to(line, { morphSVG: S.body, duration: .6, ease: 'power2.inOut' }, tM)
        .to(line, { fill: green, stroke: green, duration: .8, ease: 'sine.inOut' }, tM - .05);
    } else {
      // повторный визит: улыбка уже зелёная и собрана, только мягко проявляется
      tl.set([dot, tbox], { autoAlpha: 0 }, 0)
        .set(line, { opacity: 1, scaleX: 1, fill: green, stroke: green }, 0)
        .set(line, { morphSVG: S.body }, 0)
        .fromTo(smile, { autoAlpha: 0 }, { autoAlpha: 1, duration: .3, ease: 'sine.out' }, 0);
    }
    tl.to(line, { morphSVG: S.smile, duration: short ? .3 : .45, ease: 'power2.out' }, tH)
      .fromTo(horns, { autoAlpha: 1, drawSVG: '0%' }, { drawSVG: '100%', duration: short ? .3 : .5, ease: 'power1.inOut' }, tH)
      .to(horns, { autoAlpha: 0, duration: .3, ease: 'sine.out' }, tH + (short ? .3 : .5));
    if (!short) {
      // «вдох»: улыбка чуть приподнимается и опускается — пауза перед лентой
      tl.fromTo(smile, { scale: 1, transformOrigin: '50% 100%' }, { scale: 1.018, duration: .25, ease: 'sine.inOut', yoyo: true, repeat: 1 }, tH + .45);
      // лента медленно проезжает слева направо; под ней остаётся GRINCHIN с фактурой скотча
      tl.fromTo(rev, { p: 0 }, { p: 1, duration: .75, ease: 'power1.inOut', onUpdate: function () {
          var c = -38 + rev.p * 175;  // центр ленты, % ширины знака
          G.set(tbox, { xPercent: -120 + rev.p * 380 });
          lt.style.clipPath = 'inset(-20% ' + clamp(0, 100, 100 - c) + '% -20% 0)';
        } }, tT)
        .to(tape, { rotation: 6, y: -10, duration: .3, ease: 'sine.in' }, tT + .55)
        .to(tbox, { xPercent: 470, autoAlpha: 0, duration: .35, ease: 'power2.in' }, tT + .6);
    } else {
      tl.fromTo(lt, { clipPath: 'inset(-20% 0% -20% 0)', autoAlpha: 0 }, { autoAlpha: 1, duration: .3, ease: 'sine.out' }, tT);
    }
    // FLIP в шапку + сайт раскрывается эллипсом из клюва
    var fd = short ? .45 : .52;
    tl.to(mk, { x: function () { return target().x; }, y: function () { return target().y; }, scale: function () { return target().s; },
                duration: fd, ease: 'power2.inOut' }, tF)
      .to([lt, line], { color: function () { return target().col; }, fill: function () { return target().col; }, stroke: 'transparent', duration: fd, ease: 'sine.inOut' }, tF)
      .to(lt, { '--ld-tx': 0, duration: fd * .8, ease: 'sine.inOut' }, tF)
      .to([cap, grain], { autoAlpha: 0, duration: .3, ease: 'sine.out' }, tF - .1)
      .fromTo(ld, { '--ld-rx': '0px', '--ld-ry': '0px' }, {
        '--ld-rx': function () { return target().R + 'px'; }, '--ld-ry': function () { return target().R * .8 + 'px'; },
        duration: fd, ease: 'power2.in',
        onStart: function () { var f = target(); ld.style.setProperty('--ld-bx', f.bx + 'px'); ld.style.setProperty('--ld-by', f.by + 'px'); }
      }, tF + .04);
    // логотип в шапке становится видимым ровно на приземлении
    tl.call(function () { var l = $('#logo'); if (l) l.style.visibility = 'visible'; }, null, tF + fd - .01)
      .call(function () { var l = $('#logo'); if (l) l.style.visibility = ''; }, null, tF + fd + .05);
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (t) { W.addEventListener(t, skip, { capture: true, passive: true }); });
    setTimeout(function () { if (!done) skip(); }, 6000);   // страховка
    whenDom(function () { heroSplit(); requestAnimationFrame(function () { tl.play(); }); });
  }

  /* ================= 2a. ПЕРЕХОД ЛЕНТОЙ ================= */
  var wipeEl = null, wiping = false;
  function buildWipe() {
    if (wipeEl) return wipeEl;
    wipeEl = D.createElement('div'); wipeEl.className = 'mx-wipe'; wipeEl.setAttribute('aria-hidden', 'true');
    wipeEl.innerHTML = '<div class="mx-wipe-bg"></div>';
    wipeEl.appendChild(makeTape('GRINCHIN', { repeat: 12, seed: 'a', tone: 'pigment' }));
    wipeEl.appendChild(makeTape('GRINCHIN', { repeat: 12, seed: 'b', tone: 'brand' }));
    D.body.appendChild(wipeEl);
    return wipeEl;
  }
  function jump(el) {
    try { el.scrollIntoView({ behavior: 'instant', block: 'start' }); } catch (e) { el.scrollIntoView(true); }
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    try { el.focus({ preventScroll: true }); } catch (e) {}
    if (ST) ST.update();
  }
  function wipe(el) {
    var w = buildWipe(), bg = w.firstChild, a = w.children[1], b = w.children[2];
    if (wiping) { jump(el); return; }
    wiping = true;
    var mob = innerWidth < 768, ra = mob ? -28 : -17, rb = mob ? 24 : 14;
    G.timeline({ onComplete: function () { wiping = false; w.classList.remove('is-on'); } })
      .call(function () { w.classList.add('is-on'); })
      .set(a, { x: '-110vw', y: 0, rotation: ra - 9, skewX: 0, scale: 1.06 })
      .set(b, { x: '110vw', y: 0, rotation: rb + 9, skewX: 0, scale: 1.06 })
      .to(bg, { opacity: 1, duration: .22, ease: 'power2.out' }, 0)
      .to(a, { x: 0, rotation: ra, scale: 1, duration: .25, ease: 'power4.out' }, 0)
      .to(b, { x: 0, rotation: rb, scale: 1, duration: .25, ease: 'power4.out' }, .04)
      .call(function () { jump(el); }, null, .3)
      // срыв: в разные стороны, с поворотом и «хлопком» конца
      .to(a, { x: '125vw', y: '-24vh', rotation: ra + 8, duration: .3, ease: 'power4.in' }, .4)
      .to(a, { skewX: 14, duration: .12, yoyo: true, repeat: 1, ease: 'sine.inOut' }, .4)
      .to(b, { x: '-125vw', y: '26vh', rotation: rb - 7, duration: .3, ease: 'power4.in' }, .44)
      .to(b, { skewX: -12, duration: .12, yoyo: true, repeat: 1, ease: 'sine.inOut' }, .44)
      .to(bg, { opacity: 0, duration: .26, ease: 'power1.in' }, .46);
  }
  D.addEventListener('grinchin:navigate', function (e) {
    if (calm()) return;                                     // A скроллит сам
    var id = e.detail && e.detail.target; if (!id) return;
    var el = D.getElementById(String(id).replace(/^#/, '')); if (!el) return;
    e.preventDefault();
    wipe(el);
  });
  M.wipe = function (id) { var el = D.getElementById(String(id).replace(/^#/, '')); if (!el) return; if (calm()) jump(el); else wipe(el); };

  /* ================= 2b. БЕЙДЖИ + SOLD OUT ================= */
  var badgeIO = io(function (en) {
    if (!en.isIntersecting) return;
    var el = en.target, sibs = el.parentNode ? $$('.tape-badge', el.parentNode) : [el];
    el.style.setProperty('--d', (sibs.indexOf(el) * 90) + 'ms');
    el.classList.add('is-slapped');
    badgeIO.unobserve(el);
  }, { threshold: .6 });
  function badges() {
    $$('.tape-badge').forEach(function (b) {
      if (!mark(b, 'b')) return;
      if (calm()) b.classList.add('is-slapped'); else badgeIO.observe(b);
    });
    $$('.card[data-state="soldout"] .card-media').forEach(function (m) {
      if (!mark(m, 'h')) return;
      var h = D.createElement('div'); h.className = 'mx-hazard'; h.setAttribute('aria-hidden', 'true');
      h.innerHTML = '<i></i><i></i><b>РАЗОБРАЛИ</b>';
      m.appendChild(h);
    });
  }

  /* ================= 2c. Ч/Б → ЦВЕТ («Вспышка») ================= */
  var colorIO = io(function (en) { en.target.classList.toggle('is-color', en.isIntersecting); }, { rootMargin: '-38% 0px -38% 0px' });
  function cards() {
    $$('.card-media').forEach(function (m) {
      if (!mark(m, 'c')) return;
      var bw = D.createElement('div'); bw.className = 'mx-bw'; bw.setAttribute('aria-hidden', 'true');
      var imgs = $$('.card-img', m), last = imgs[imgs.length - 1];
      if (last && last.parentNode === m) m.insertBefore(bw, last.nextSibling); else m.insertBefore(bw, m.firstChild ? m.firstChild.nextSibling : null);
      var card = m.closest('.card');
      if (card && card.getAttribute('data-state') === 'soldout') return;
      if (SHOT) return;
      if (FINE.matches) {
        var at = function (e) { var r = m.getBoundingClientRect(); bw.style.setProperty('--mx-x', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); bw.style.setProperty('--mx-y', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%'); };
        m.addEventListener('pointerenter', function (e) { at(e); m.classList.add('is-color'); });
        m.addEventListener('pointerleave', function (e) { at(e); m.classList.remove('is-color'); });
        if (card) {
          card.addEventListener('focusin', function () { bw.style.setProperty('--mx-x', '50%'); bw.style.setProperty('--mx-y', '50%'); m.classList.add('is-color'); });
          card.addEventListener('focusout', function () { m.classList.remove('is-color'); });
        }
      } else colorIO.observe(m);
    });
  }

  /* ================= 2d. ОБРАЗЫ ================= */
  function qr(seed) {   // QR-подобный узор: три «глаза» + шум по seed
    var r = rnd('qr' + seed), n = 21, d = '', x, y;
    var eye = function (ex, ey) { return 'M' + ex + ' ' + ey + 'h7v7h-7zM' + (ex + 1) + ' ' + (ey + 1) + 'v5h5v-5zM' + (ex + 2) + ' ' + (ey + 2) + 'h3v3h-3z'; };
    var inEye = function (x, y) { return (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12); };
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (!inEye(x, y) && r() > .52) d += 'M' + x + ' ' + y + 'h1v1h-1z';
    return '<svg class="mx-qr" viewBox="-1 -1 23 23" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="' + eye(0, 0) + eye(14, 0) + eye(0, 14) + d + '"/></svg>';
  }
  var lookIO = io(function (en) { if (!en.isIntersecting) return; lookIO.unobserve(en.target); dropLook(en.target); }, { threshold: .25 });
  function dropLook(lk) {
    var ph = $('.look-photo', lk), tp = $$('.look-tape', lk), r = lk._mxr || -1.5;
    if (!ph) return;
    G.timeline()
      .fromTo(ph, { y: -110, rotation: r * 5, autoAlpha: 0 }, { y: 0, rotation: 0, autoAlpha: 1, duration: .5, ease: 'power2.in' })
      .fromTo(ph, { scaleY: .975, scaleX: 1.012 }, { scaleY: 1, scaleX: 1, duration: .35, ease: 'elastic.out(1,.4)' })
      .fromTo(tp, { scale: 1.7, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .16, ease: 'power4.out', stagger: .09 }, '-=.3');
  }
  function looks() {
    $$('.look').forEach(function (lk, i) {
      if (!mark(lk, 'l')) return;
      var r = rnd(lk.getAttribute('data-look') || i), rot = (i % 2 ? 1 : -1) * (1 + r() * 1.4);
      lk._mxr = +rot.toFixed(2);
      var phEl = $('.look-photo', lk);
      // кампейн-кадр бренда из <template id="look-shots"> (looks.html) — вместо плейсхолдеров вещей
      var tpl = $('#look-shots'), shot = tpl && tpl.content && tpl.content.querySelector('picture[data-look="' + lk.getAttribute('data-look') + '"]');
      if (phEl && shot && !$('.look-shot', phEl)) { phEl.insertBefore(shot.cloneNode(true), phEl.firstChild); lk.classList.add('has-shot'); }
      if (phEl && !$('.mx-peel', phEl)) { var fl = D.createElement('i'); fl.className = 'mx-peel'; fl.setAttribute('aria-hidden', 'true'); phEl.appendChild(fl); }
      // ленты держат фото: кусок белого скотча (скан) + зелёный кусок той же формы
      $$('.look-tape', lk).forEach(function (t, k) { t.classList.add('tp-piece'); if (k) t.classList.add('tp-piece--green'); });
      var tag = $('.look-tag', lk);
      if (tag && !$('svg', tag)) tag.insertAdjacentHTML('beforeend', qr(lk.getAttribute('data-look') || i));
      if (!FINE.matches) {
        var ph = $('.look-photo', lk);
        if (ph) ph.addEventListener('click', function (e) { if (e.target.closest('a,button')) return; lk.classList.toggle('is-peeled'); });
      }
      if (!calm()) { var p = $('.look-photo', lk); if (p) G.set(p, { autoAlpha: 0 }); G.set($$('.look-tape', lk), { autoAlpha: 0 }); lookIO.observe(lk); }
    });
  }

  /* ================= 2e. БЕГУЩАЯ ЛЕНТА ================= */
  var runs = [], vel = 0, lastY = W.scrollY, velST = null;
  function tapeRuns() {
    $$('.tape-run[data-text]').forEach(function (el, i) {
      if (!mark(el, 'r')) return;
      var dir = i % 2 ? 1 : -1;
      el.style.setProperty('--run-r', (dir * 1.6) + 'deg');
      var w = makeTape('', { edge: false, raw: true, tone: ['brand', 'pigment', 'white'][i % 3] }), txt = w.querySelector('.tp-txt');
      w.firstChild.classList.add('tp--open');
      el.appendChild(w);
      var unit = D.createElement('span'); unit.textContent = el.getAttribute('data-text') + ' • ';
      unit.style.paddingRight = '.4em';
      txt.appendChild(unit);
      var R = { el: el, txt: txt, unit: unit, uw: 0, x: 0, dir: dir, skew: 0, on: false };
      runs.push(R);
      fillRun(R);
      if (!calm()) io(function (en) { R.on = en.isIntersecting; }).observe(el);
    });
    if (runs.length && !calm() && !tapeRuns.tick) {
      tapeRuns.tick = true;
      if (ST && !velST) velST = ST.create({ start: 0, end: 'max' });
      G.ticker.add(function (t, dt) {
        var v = velST ? velST.getVelocity() : 0;
        if (!velST) { v = (W.scrollY - lastY) / Math.max(dt, 1) * 1000; lastY = W.scrollY; }
        vel += (v - vel) * .12;
        runs.forEach(function (R) {
          if (!R.on || !R.uw) return;
          var sp = (60 + Math.abs(vel) * .35) * (vel < -5 ? -1 : 1) * R.dir;
          R.x = (R.x + sp * dt / 1000) % R.uw; if (R.x > 0) R.x -= R.uw;
          R.skew += (clamp(-6, 6, -vel / 260 * R.dir) - R.skew) * .15;
          R.txt.style.transform = 'translate3d(' + R.x.toFixed(2) + 'px,0,0) skewX(' + R.skew.toFixed(2) + 'deg)';
        });
      });
    }
  }
  function fillRun(R) {
    var go = function () {
      R.uw = R.unit.getBoundingClientRect().width; if (!R.uw) return;
      var need = Math.ceil((R.el.clientWidth * 1.15) / R.uw) + 1;
      while (R.txt.children.length < need) R.txt.appendChild(R.unit.cloneNode(true));
    };
    go(); if (D.fonts && D.fonts.ready) D.fonts.ready.then(go);
  }

  /* ================= 2f. ОТРЫВНАЯ ЛЕНТА ФУТЕРА ================= */
  function footerTape() {
    var box = $('#footer-tape'); if (!box || !mark(box, 'f')) return;
    var par = box.parentNode; if (par && getComputedStyle(par).position === 'static') par.style.position = 'relative';
    var left = 2;
    ['GRINCHIN', 'ВХОД ЗАКРЫТ'].forEach(function (t, i) {
      var w = makeTape(t, { repeat: 10, seed: 'ft' + i, tone: i ? 'pigment' : 'brand', cls: 'mx-ft' });
      w.removeAttribute('aria-hidden');
      w.setAttribute('role', 'button'); w.setAttribute('tabindex', '0');
      w.setAttribute('aria-label', 'Оторвать ленту — под ней контакты');
      box.appendChild(w);
      var torn = false;
      var rip = function (dx, dy) {
        if (torn) return; torn = true; left--;
        w.style.pointerEvents = 'none';
        var done = function () { w.style.visibility = 'hidden'; w.style.display = 'none'; if (!left) { box.classList.add('is-torn'); fire('grinchin:tape-torn'); } };
        if (calm()) { done(); return; }
        G.to(w, { x: (dx || (i ? -1 : 1)) * innerWidth * 1.1, y: '+=' + (dy || 160), rotation: (i ? -1 : 1) * 34, duration: .6, ease: 'power2.in', onComplete: done });
      };
      w.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); rip(); } });
      if (DRAG && !calm()) {
        var base = i ? -7 : 5;
        DRAG.create(w, { type: 'x,y', zIndexBoost: false, minimumMovement: 4,
          onDrag: function () { G.set(w, { rotation: base + this.y / 7 + this.x / 40 }); },
          onClick: function () { rip(); },
          onRelease: function () {
            var d = Math.hypot(this.x, this.y);
            if (d > 110) rip(this.x > 0 ? 1 : -1, this.y);
            else G.to(w, { x: 0, y: 0, rotation: base, duration: .6, ease: 'elastic.out(1,.35)' });
          } });
      } else w.addEventListener('click', function () { rip(); });
    });
    var hint = D.createElement('span'); hint.className = 'mx-ft-hint'; hint.setAttribute('aria-hidden', 'true');
    hint.textContent = FINE.matches ? 'тяни ленту ↗' : 'оторви ленту ↗';
    box.appendChild(hint);
  }

  /* ================= 3. ИСТОРИЯ ЛОГО ================= */
  var CAPS = [
    ['Ограничение.', 'стоп. только туда или туда'],
    ['Не все ограничения нужно ломать.', 'стрелки гнутся в ухмылку'],
    ['STOP превращается в ST’ART.', 'одна полоска ленты'],
    ['Знак собран из настоящего скотча.', 'наклеили, сняли, отсканировали'],
    ['Ограничение — это не только стена.', 'это повод искать щель']
  ];
  function logoStory() {
    var host = $('#logo-story'); if (!host || !mark(host, 's')) return;
    var S = shapes(), lg = $('#logo svg'), mob = innerWidth < 768;
    var letters = $$('.ld-letters .lg-l').length ? $$('.ld-letters .lg-l') : $$('#logo .lg-l');
    if (!letters.length || !S.arr_l) return;
    var L = mob ? { w: 900, h: 1180, sg: [450, 270, 185], pl: [450, 640, .4], lo: [450, 600, .46], pole: 1180 }
                : { w: 1600, h: 820, sg: [800, 220, 150], pl: [800, 520, .33], lo: [800, 420, .74], pole: 820 };
    var green = css('--c-green'), white = css('--c-white');
    var stage = D.createElement('div'); stage.className = 'ls';
    stage.innerHTML = '<div class="ls-steps" aria-hidden="true">' + CAPS.map(function (c, i) { return '<span>’0' + (i + 1) + '</span>'; }).join('') + '</div>';
    var svg = svgEl('svg', { 'class': 'ls-svg', viewBox: '0 0 ' + L.w + ' ' + L.h, 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMid meet' }, stage);
    var caps = D.createElement('div'); caps.className = 'ls-caps';
    caps.innerHTML = CAPS.map(function (c) { return '<p class="ls-cap">' + c[0] + '<small>' + c[1] + '</small></p>'; }).join('');
    stage.appendChild(caps);
    host.appendChild(stage);
    var defs = svgEl('defs', {}, svg);
    // — знак STOP на столбе (ч/б)
    var sx = L.sg[0], sy = L.sg[1], sr = L.sg[2], k = sr / 200;
    var signG = svgEl('g', { 'class': 'ls-sign' }, svg);
    svgEl('rect', { x: sx - 8, y: sy, width: 16, height: L.pole - sy, style: 'fill:var(--c-muted)' }, signG);
    var oct = function (r) { var p = []; for (var i = 0; i < 8; i++) { var a = (22.5 + 45 * i) * Math.PI / 180; p.push((200 + r * Math.cos(a)).toFixed(1) + ' ' + (200 + r * Math.sin(a)).toFixed(1)); } return 'M' + p.join('L') + 'z'; };
    var sign = svgEl('g', { transform: 'translate(' + (sx - sr) + ' ' + (sy - sr) + ') scale(' + k + ')' }, signG);
    svgEl('path', { d: oct(196), style: 'fill:var(--c-muted)' }, sign);
    svgEl('path', { d: oct(180), fill: 'none', style: 'stroke:var(--c-white)', 'stroke-width': 11, 'stroke-linejoin': 'round' }, sign);
    var T = function (ch, x, fs, cls) { var t = svgEl('text', { x: x, y: 200, dy: '.36em', 'text-anchor': 'middle', 'font-size': fs, 'class': 'ls-text ' + (cls || ''), style: 'fill:var(--c-white)' }, sign); t.textContent = ch; return t; };
    var tS = T('S', 100, 92), tT = T('T', 163, 92), tO = T('O', 231, 92), tP = T('P', 299, 92);
    var nA = T('A', 211, 64, 'ls-new'), nR = T('R', 256, 64, 'ls-new'), nT = T('T', 300, 64, 'ls-new');
    var apo = svgEl('rect', { x: 168, y: 136, width: 18, height: 44, rx: 1, style: 'fill:var(--c-lime);stroke:var(--c-black)', 'stroke-width': 4, 'class': 'ls-apo' }, sign);
    // — табличка ←→ (координаты логотипа 1854×390)
    var plate = svgEl('g', { 'class': 'ls-plate' }, svg);
    var plateBg = svgEl('g', {}, plate);
    svgEl('rect', { x: 6, y: 46, width: 1842, height: 308, rx: 36, style: 'fill:var(--c-paper);stroke:var(--c-muted)', 'stroke-width': 10 }, plateBg);
    svgEl('rect', { x: 34, y: 74, width: 1786, height: 252, rx: 18, fill: 'none', style: 'stroke:var(--c-ink-2)', 'stroke-width': 4 }, plateBg);
    var aL = svgEl('path', { d: S.arr_l, style: 'fill:var(--c-black)' }, plate);
    var aR = svgEl('path', { d: S.arr_r, style: 'fill:var(--c-black)' }, plate);
    var mkL = svgEl('path', { d: S.arr_l, 'class': 'ls-mark', transform: 'translate(0 0)' }, plate);
    var mkR = svgEl('path', { d: S.arr_r, 'class': 'ls-mark' }, plate);
    // — буквы из полос ленты (клип по контуру буквы)
    var word = svgEl('g', { 'class': 'ls-word' }, svg);
    var strips = [], r = rnd('ls'), tones = ['var(--c-green)', 'var(--c-smile)', 'var(--c-acid)'];
    letters.forEach(function (lp, i) {
      var d = lp.getAttribute('d'), id = 'lsc' + i;
      var cp = svgEl('clipPath', { id: id }, defs); svgEl('path', { d: d }, cp);
      var g = svgEl('g', { 'clip-path': 'url(#' + id + ')' }, word);
      var probe = svgEl('path', { d: d }, g), bb; try { bb = probe.getBBox(); } catch (e) { bb = null; } g.removeChild(probe);
      if (!bb || !bb.width) bb = { x: 0, y: 40, width: 200, height: 200 };
      var n = 4, hh = bb.height / (n - .6);
      for (var j = 0; j < n; j++) {
        var s = svgEl('rect', { x: bb.x - 40, y: bb.y - hh * .2 + j * (bb.height / n), width: bb.width + 80, height: hh, style: 'fill:' + tones[(i + j) % 3] }, g);
        G && G.set(s, { rotation: (r() - .5) * 14, transformOrigin: '50% 50%' });
        strips.push(s);
      }
    });
    // — стрелка ↗ из G
    var gArrow = svgEl('path', { d: 'M300 40 C 330 -10 360 -40 430 -90 M366 -96 L432 -92 L420 -28', fill: 'none', style: 'stroke:var(--c-lime)', 'stroke-width': 26, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, word);
    // — позиции групп
    var plateAt = function (p) { return { x: p[0] - 927 * p[2], y: p[1] - 195 * p[2], scale: p[2] }; };
    var steps = $$('.ls-steps span', stage), capEls = $$('.ls-cap', stage);
    var STATIC = calm() || !MORPH || !DRAW;
    if (!G) return;
    G.set(plate, plateAt(L.pl));
    G.set(word, plateAt(L.lo));
    G.set([nA, nR, nT], { autoAlpha: 0, scale: 0, transformOrigin: '50% 50%' });
    G.set(apo, { autoAlpha: 0, scale: 2.4, rotation: 40, transformOrigin: '50% 50%' });
    G.set(strips, { autoAlpha: 0 });
    if (DRAW) G.set([mkL, mkR, gArrow], { drawSVG: '0%' });
    var tl = G.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
    var cap = function (i, at) {
      tl.to(capEls, { autoAlpha: 0, y: -10, duration: .25 }, at)
        .fromTo(capEls[i], { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: .35 }, at + .2)
        .call(function () { steps.forEach(function (s, j) { s.classList.toggle('is-on', j <= i); }); }, null, at + .1);
    };
    tl.call(function () { steps.forEach(function (s, j) { s.classList.toggle('is-on', j === 0); }); }, null, 0);
    G.set(capEls, { autoAlpha: 0 }); G.set(capEls[0], { autoAlpha: 1 });
    // 2: маркер обводит стрелки, древко прогибается, наконечники — в рожки
    cap(1, 1);
    tl.to([mkL, mkR], { drawSVG: '100%', duration: .8, stagger: .15, ease: 'none' }, 1.1);
    if (MORPH) {
      tl.to(aL, { morphSVG: S.half_l, duration: 1, ease: 'back.out(1.4)' }, 1.9)
        .to(aR, { morphSVG: S.half_r, duration: 1, ease: 'back.out(1.4)' }, 1.9)
        .to([mkL, mkR], { morphSVG: function (i) { return i ? S.half_r : S.half_l; }, autoAlpha: 0, duration: .8 }, 1.9);
    }
    tl.to([aL, aR], { fill: green, duration: .6 }, 1.95)
      .to(plateBg, { autoAlpha: 0, duration: .6 }, 2.3);
    // 3: STOP → ST'ART
    cap(2, 3);
    tl.to(tO, { y: 140, rotation: 30, autoAlpha: 0, duration: .5, ease: 'power2.in' }, 3.1)
      .to(tP, { y: 160, rotation: -24, autoAlpha: 0, duration: .5, ease: 'power2.in' }, 3.15)
      .to(tS, { attr: { x: 103, 'font-size': 64 }, duration: .5 }, 3.3)
      .to(tT, { attr: { x: 147, 'font-size': 64 }, duration: .5 }, 3.3)
      .to(apo, { autoAlpha: 1, scale: 1, rotation: 8, duration: .25, ease: 'back.out(3)' }, 3.75)
      .to([nA, nR, nT], { autoAlpha: 1, scale: 1, duration: .35, stagger: .08, ease: 'back.out(2.2)' }, 3.9)
      .to(sign.firstChild, { fill: green, duration: .4 }, 4.2);
    // 4: знак уходит, буквы собираются из влетающих полос
    cap(3, 5);
    tl.to(signG, { y: -L.h * .55, autoAlpha: 0, duration: .9, ease: 'power2.in' }, 5);
    var r2 = rnd('fly');
    strips.forEach(function (s, i) {
      var a = (r2() - .5) * 2;
      tl.fromTo(s, { autoAlpha: 0, x: (r2() > .5 ? 1 : -1) * (700 + r2() * 900), y: (r2() - .5) * 900, rotation: '+=' + a * 50 },
        { autoAlpha: 1, x: 0, y: 0, rotation: '-=' + a * 50, duration: .7, ease: 'power3.out' }, 5.3 + i * .045);
    });
    // 5: улыбка подъезжает под слово, у G отрастает стрелка
    cap(4, 7.6);
    var to = plateAt(L.lo); to.duration = 1.1; to.ease = 'power3.inOut';
    tl.to(plate, to, 7.6)
      .to(gArrow, { drawSVG: '100%', duration: .7, ease: 'power2.out' }, 8.8)
      .to({}, { duration: .6 }, 9.5);
    M.storyTl = tl;
    if (STATIC) { comic(host, stage, svg, tl, L); return; }
    G.matchMedia().add({ d: '(min-width: 768px)', m: '(max-width: 767px)' }, function (c) {
      ST.create({ trigger: stage, start: 'top top', end: c.conditions.d ? '+=320%' : '+=200%', pin: true, scrub: .6, animation: tl, anticipatePin: 1 });
    });
  }
  function comic(host, stage, svg, tl, L) {
    var marks = [.0, 2.95, 4.95, 7.5, 10], dur = tl.duration();
    // кадрируем каждую панель: 1–3 — знак с табличкой, 4–5 — логотип
    var pw = 1854 * L.pl[2], lw = 1854 * L.lo[2], top = L.sg[1] - L.sg[2] - 24;
    var vbSign = [L.pl[0] - pw / 2 - 30, top, pw + 60, L.pl[1] + 195 * L.pl[2] + 40 - top].map(Math.round).join(' ');
    var vbLogo = [L.lo[0] - lw / 2 - 30, L.lo[1] - 340 * L.lo[2], lw + 60, 560 * L.lo[2]].map(Math.round).join(' ');
    var wrap = D.createElement('div'); wrap.className = 'ls-comic';
    marks.forEach(function (t, i) {
      tl.progress(Math.min(1, t / dur));
      var html = svg.outerHTML.replace(/lsc(\d)/g, 'lsc' + i + '_$1').replace(/viewBox="[^"]*"/, 'viewBox="' + (i < 3 ? vbSign : vbLogo) + '"');
      var f = D.createElement('figure'); f.className = 'ls-panel';
      f.innerHTML = html + '<figcaption><span>’0' + (i + 1) + '</span>' + CAPS[i][0] + '</figcaption>';
      wrap.appendChild(f);
    });
    host.removeChild(stage);
    host.appendChild(wrap);
  }

  /* ================= 5. «УХМЫЛ» ================= */
  var smirks = [], ptr = null;
  var BEAK = '927 388';
  function smirkBuild(el) {
    var S = shapes(); if (!S.half_l) return;
    el.innerHTML = '<svg viewBox="-40 -330 1934 760" aria-hidden="true"><g class="sm-face"><g class="sm-eyes">' +
      '<circle class="sm-eye" cx="700" cy="-125" r="74"/><circle class="sm-eye" cx="1154" cy="-125" r="74"/></g>' +
      '<g class="sm-mouth"><path class="sm-l" fill="currentColor" d="' + S.half_l + '"/><path class="sm-r" fill="currentColor" d="' + S.half_r + '"/></g></g></svg>';
    if (!el.hasAttribute('role')) el.setAttribute('aria-hidden', 'true');
    var o = { el: el, mouth: $('.sm-mouth', el), eyes: $('.sm-eyes', el), eye: $$('.sm-eye', el), r: $('.sm-r', el), on: true, loops: [] };
    el._sm = o; smirks.push(o);
    if (G) {
      G.set(o.mouth, { svgOrigin: '927 200' });
      o.ex = G.quickTo(o.eyes, 'x', { duration: .35, ease: 'power3' });
      o.ey = G.quickTo(o.eyes, 'y', { duration: .35, ease: 'power3' });
      o.io = io(function (en) { o.on = en.isIntersecting; o.loops.forEach(function (l) { o.on ? l.resume() : l.pause(); }); });
      o.io.observe(el);
    }
    mood(el, el.getAttribute('data-mood') || 'idle', true);
    if ('MutationObserver' in W) { o.mo = new MutationObserver(function () { mood(el, el.getAttribute('data-mood') || 'idle'); }); o.mo.observe(el, { attributes: true, attributeFilter: ['data-mood'] }); }
    // в корзине настроение — от числа товаров
    if (el.closest('#cart-drawer') && cartCount > 0) el.setAttribute('data-mood', 'happy');
  }
  function mood(el, m, first) {
    var o = el._sm; if (!o || !G) return;
    if (o.mood === m && !first) return; o.mood = m;
    o.loops.forEach(function (l) { l.kill(); }); o.loops = [];
    var still = calm(), d = still ? 0 : 1;
    G.killTweensOf([o.mouth, o.eye, o.r]);
    if (m === 'sad') {
      G.to(o.mouth, { scaleY: -1, scaleX: .9, y: 70, duration: .5 * d, ease: 'back.out(2.2)', svgOrigin: '927 200' });
      G.to(o.eye, { scaleY: .7, y: 40, duration: .4 * d, transformOrigin: '50% 50%' });
    } else {
      G.to(o.mouth, { scaleY: 1, scaleX: 1, y: 0, duration: .5 * d, ease: 'back.out(2.6)', svgOrigin: '927 200' });
      G.to(o.eye, { scaleY: m === 'happy' ? .45 : 1, y: m === 'happy' ? -14 : 0, duration: .3 * d, transformOrigin: '50% 50%' });
      if (m === 'happy' && !still) G.fromTo(o.mouth, { scale: 1.16 }, { scale: 1, duration: .6, ease: 'elastic.out(1.1,.35)', svgOrigin: '927 200' });
    }
    if (m === 'wink') { wink(el, true); }
    if (still) return;
    if (m === 'idle' || m === 'look') {
      o.loops.push(G.to(o.mouth, { scaleY: 1.045, duration: 1.7, yoyo: true, repeat: -1, ease: 'sine.inOut', svgOrigin: '927 200' }));
    }
    if (m !== 'happy') {
      var blink = G.timeline({ repeat: -1, repeatDelay: 2.6 + Math.random() * 2.4, delay: 1 + Math.random() * 2 })
        .to(o.eye, { scaleY: .08, duration: .07, transformOrigin: '50% 50%' }).to(o.eye, { scaleY: m === 'sad' ? .7 : 1, duration: .12 });
      o.loops.push(blink);
    }
    if (!o.on) o.loops.forEach(function (l) { l.pause(); });
  }
  function wink(el, loop) {
    var o = el._sm; if (!o || !G || calm()) return;
    var t = G.timeline({ repeat: loop ? -1 : 0, repeatDelay: 2.4 })
      .to(o.r, { rotation: -15, duration: .14, ease: 'power3.out', svgOrigin: BEAK }, 0)
      .to(o.eye[1], { scaleY: .08, duration: .1, transformOrigin: '50% 50%' }, 0)
      .to(o.r, { rotation: 0, duration: .5, ease: 'elastic.out(1.2,.35)', svgOrigin: BEAK }, .32)
      .to(o.eye[1], { scaleY: o.mood === 'happy' ? .45 : 1, duration: .14 }, .36);
    if (loop) o.loops.push(t);
  }
  function smirkScan() {
    // корзина A пересоздаёт свой .smirk при каждом рендере — мёртвые экземпляры чистим
    smirks = smirks.filter(function (o) {
      if (o.el.isConnected) return true;
      o.loops.forEach(function (l) { l.kill(); }); if (o.mo) o.mo.disconnect(); if (o.io) o.io.disconnect();
      return false;
    });
    $$('.smirk').forEach(function (el) { if (mark(el, 'm')) smirkBuild(el); });
  }
  function track(e) {
    if (calm()) return;
    smirks.forEach(function (o) {
      if (!o.on || !o.ex || o.mood === 'sad') return;
      var r = o.el.getBoundingClientRect(); if (!r.width) return;
      var cx = r.left + r.width * .48, cy = r.top + r.height * .2, a = Math.atan2(e.clientY - cy, e.clientX - cx);
      var k = clamp(0, 1, Math.hypot(e.clientX - cx, e.clientY - cy) / 260) * (o.mood === 'look' ? 1 : .6);
      o.ex(Math.cos(a) * 46 * k); o.ey(Math.sin(a) * 34 * k);
    });
  }
  W.addEventListener('pointermove', function (e) { ptr = e; if (!track.raf) track.raf = requestAnimationFrame(function () { track.raf = 0; track(ptr); }); }, { passive: true });
  M.setMood = function (el, m) { if (el) el.setAttribute('data-mood', m); };

  /* корзина в шапке: маленькая улыбка, пустая — грустная */
  var cartCount = 0, cartIcon = null;
  function cartBtn() {
    return $('[data-cart-icon]') || $('#header [data-open="cart"]') || $('#header [aria-controls="cart-drawer"]') ||
      $('#header .cart-btn') || $('#header .header-cart') || $$('#header button, #header a').filter(function (b) { return /корзин/i.test(b.textContent); })[0];
  }
  function cartIconScan() {
    if (cartIcon && D.contains(cartIcon)) return;
    var b = cartBtn(), S = shapes(); if (!b || !S.smile) return;
    var host = b;
    cartIcon = svgEl('svg', { 'class': 'mx-cart-smile', viewBox: '0 0 1854 390', 'aria-hidden': 'true' });
    svgEl('path', { d: S.smile, fill: 'currentColor' }, cartIcon);
    host.insertBefore(cartIcon, host.firstChild);
    cartIcon.classList.toggle('is-full', cartCount > 0);
  }
  D.addEventListener('grinchin:cart', function (e) {
    cartCount = (e.detail && +e.detail.count) || 0;
    if (cartIcon) cartIcon.classList.toggle('is-full', cartCount > 0);
    $$('#cart-drawer .smirk').forEach(function (s) { s.setAttribute('data-mood', cartCount > 0 ? 'happy' : 'sad'); });
  });
  D.addEventListener('grinchin:add', function () {
    if (cartIcon && !calm()) { cartIcon.classList.remove('is-pop'); void cartIcon.getBoundingClientRect(); cartIcon.classList.add('is-pop'); }
    smirks.forEach(function (o) { if (o.on) wink(o.el, false); });
  });
  D.addEventListener('grinchin:overlay', function (e) {
    var d = e.detail || {}; if (!d.open) return;
    if (d.name === 'cart') $$('#cart-drawer .smirk').forEach(function (s) { s.setAttribute('data-mood', cartCount > 0 ? 'happy' : 'sad'); });
    if (d.name === '404') {
      smirkScan();
      $$('#page-404 .smirk').forEach(function (s) {
        if (!s.getAttribute('data-mood')) s.setAttribute('data-mood', 'look');
        if (!calm()) G.fromTo(s, { y: 70, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .6, delay: .15, ease: 'back.out(1.8)' });
      });
    }
  });
  D.addEventListener('grinchin:mark', function () {
    var c = $('#gather-counter') || $('#logo'); if (!c || calm()) return;
    var r = c.getBoundingClientRect(), p = D.createElement('i'); p.className = 'mx-ping';
    p.style.left = (r.left + r.width / 2) + 'px'; p.style.top = (r.top + r.height / 2) + 'px'; D.body.appendChild(p);
    G.fromTo(p, { scale: .5, opacity: 1 }, { scale: 6, opacity: 0, duration: .7, ease: 'power2.out', onComplete: function () { p.remove(); } });
    var l = $('#logo svg'); if (l) G.fromTo(l, { scale: 1.08 }, { scale: 1, duration: .5, ease: 'elastic.out(1,.4)', transformOrigin: '50% 60%' });
  });
  D.addEventListener('grinchin:gather-complete', function () {
    smirks.forEach(function (o) { o.el.setAttribute('data-mood', 'happy'); });
    var l = $('#logo svg'); if (l && !calm()) G.fromTo(l, { filter: 'drop-shadow(0 0 0px transparent)' }, { filter: 'drop-shadow(0 0 14px ' + css('--c-acid') + ')', duration: .4, yoyo: true, repeat: 3 });
  });

  /* ================= 6. МИКРО ================= */
  function magnetic() {
    if (!FINE.matches || calm()) return;
    $$('[data-magnetic], .btn, .cta').forEach(function (b) {
      if (!mark(b, 'g')) return;
      var qx = G.quickTo(b, 'x', { duration: .4, ease: 'power3' }), qy = G.quickTo(b, 'y', { duration: .4, ease: 'power3' });
      b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); qx(clamp(-7, 7, (e.clientX - r.left - r.width / 2) * .22)); qy(clamp(-5, 5, (e.clientY - r.top - r.height / 2) * .3)); });
      b.addEventListener('pointerleave', function () { G.to(b, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1,.4)' }); });
    });
  }
  var navLinks = [];
  var navIO = io(function (en) {
    if (!en.isIntersecting) return;
    navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  function nav() {
    var S = shapes(); if (!S.smile) return;
    $$('#header a[href^="#"], #header [data-nav]').forEach(function (a) {
      if (a.id === 'logo' || a.closest('#logo') || !mark(a, 'n')) return;
      var id = (a.getAttribute('href') || '').slice(1) || a.getAttribute('data-nav'), sec = id && D.getElementById(id);
      if (!sec || /^(hero|status|header)$/.test(id)) return;
      a.classList.add('mx-navlink');
      a.insertAdjacentHTML('beforeend', '<span class="mx-ul" aria-hidden="true"><svg viewBox="0 0 1854 390" preserveAspectRatio="none"><path fill="currentColor" d="' + S.smile + '"/></svg></span>');
      navLinks.push(a); navIO.observe(sec);
    });
  }
  function splitWords(el) {
    var walk = function (n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var parts = c.textContent.split(/(\s+)/), f = D.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { f.appendChild(D.createTextNode(p)); return; }
            var o = D.createElement('span'), i = D.createElement('span'); o.className = 'mx-w'; i.className = 'mx-wi'; i.textContent = p; o.appendChild(i); f.appendChild(o);
          });
          n.replaceChild(f, c);
        } else if (c.nodeType === 1 && !/^(BR|SVG|IMG)$/i.test(c.tagName) && !c.classList.contains('mx-w')) {
          if (c.children.length || /\S\s+\S/.test(c.textContent)) walk(c); else { var o = D.createElement('span'); o.className = 'mx-w'; c.parentNode.insertBefore(o, c); var i = D.createElement('span'); i.className = 'mx-wi'; o.appendChild(i); i.appendChild(c); }
        }
      });
    };
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
  }
  function revealHead(h) {
    var w = $$('.mx-wi', h);
    // y:0 явно: иначе GSAP подхватывает translateY(110%) из CSS как y в px и слово стоит спрятанным до конца твина
    G.fromTo(w, { y: 0, yPercent: 110 }, { y: 0, yPercent: 0, duration: .9, stagger: .05, ease: 'power3.out', onComplete: function () { h.setAttribute('data-mx-split', 'done'); G.set(w, { clearProps: 'transform' }); } });
  }
  var headIO = io(function (en) { if (!en.isIntersecting) return; headIO.unobserve(en.target); revealHead(en.target); }, { threshold: .35 });
  function heads() {
    if (calm()) return;
    $$('main section h2, section[id] > h2, section[id] header h2, [data-split]').forEach(function (h) {
      if (h.closest('#logo-story, .ls, [role="dialog"], #product-sheet, #cart-drawer, #size-modal, #page-404') || !mark(h, 'h')) return;
      splitWords(h); h.setAttribute('data-mx-split', 'pending'); headIO.observe(h);
    });
  }
  // заголовок hero делится на слова ещё под лоадером — иначе он мелькал: виден → спрятан → выезжает
  function heroSplit() {
    var h = $('#hero-title'); if (!h || calm() || !mark(h, 'h')) return h && h._mxSplit ? h : null;
    splitWords(h); h.setAttribute('data-mx-split', 'pending'); h._mxSplit = 1; return h;
  }
  function heroTitle() {
    var h = $('#hero-title'); if (!h || calm() || h._mxShown) return;
    heroSplit(); if (!h._mxSplit) return; h._mxShown = 1;
    requestAnimationFrame(function () { revealHead(h); });
  }

  /* ================= запуск + подхват новых узлов ================= */
  function scan() {
    try { badges(); } catch (e) { console.warn('[motion] badges', e); }
    try { cards(); } catch (e) { console.warn('[motion] cards', e); }
    try { looks(); } catch (e) { console.warn('[motion] looks', e); }
    try { tapeRuns(); } catch (e) { console.warn('[motion] runs', e); }
    try { footerTape(); } catch (e) { console.warn('[motion] footer', e); }
    try { smirkScan(); } catch (e) { console.warn('[motion] smirk', e); }
    try { cartIconScan(); } catch (e) { console.warn('[motion] cart', e); }
    try { magnetic(); } catch (e) { console.warn('[motion] magnetic', e); }
    try { nav(); } catch (e) { console.warn('[motion] nav', e); }
    try { heads(); } catch (e) { console.warn('[motion] heads', e); }
  }
  var pend = 0, needRefresh = false;
  function later(layout) {
    if (layout) needRefresh = true;
    if (pend) return;
    pend = requestAnimationFrame(function () { pend = 0; scan(); if (ST && needRefresh) { needRefresh = false; ST.refresh(); } });
  }
  M.refresh = function () { later(true); };

  try { loader(); } catch (e) { console.warn('[motion] loader', e); H.setAttribute('data-loader', 'done'); whenDom(ready); }
  whenDom(function () {
    scan();
    try { logoStory(); } catch (e) { console.warn('[motion] story', e); }
    if (H.dataset.loader === 'off' && !calm() && M.isReady) heroTitle();
    if ('MutationObserver' in W) new MutationObserver(function (ms) {
      // перерисовки в оверлеях (корзина, карточка) — только скан, без пересчёта ScrollTrigger
      for (var i = 0; i < ms.length; i++) if (ms[i].addedNodes.length) { var n = ms[i].addedNodes[0]; if (n.nodeType === 1 && !/^(mx-|tp|ls)/.test(typeof n.className === 'string' ? n.className : '')) { later(!!(ms[i].target.closest && ms[i].target.closest('#main'))); return; } }
    }).observe(D.body, { childList: true, subtree: true });
  });
})();
