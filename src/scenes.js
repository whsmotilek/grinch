/* GRINCHIN v3 · K2 · 3D-сцены страницы → window.GV.scenes
   1) Знак ONE WAY or ANOTHER — ось data-brand="sign", контейнер #brand-stage (ставит K4 в about.html).
      Desktop: блок резервирует высоту (CSS, без pin-спейсера — CLS 0), внутри sticky-кадр; прокрутка
      оборачивает знак на столбе: лицевая «ONE WAY ←» → ребро → оборот (оцинковка, стикер GRiNCHiN, скотч) →
      лицевая, где стрелка уже смотрит в другую сторону, и баллоном проявляется OR ANOTHER.
      Mobile (≤767): без sticky, оборот проигрывается один раз при входе в кадр (2,4 с), тап — ещё раз.
   2) Рулон фирменной ленты — ось data-roll="on", контейнер #roll-stage (ставит K1 перед #next).
      Desktop: рулон катится по асфальту в такт прокрутке, кладёт полосу GRiNCHiN и худеет до втулки.
      Mobile: та же сцена проигрывается один раз при входе (2,6 с).
   Обе сцены рисует ОДИН контекст WebGL из three-g.js (GV.gl): строятся лениво, когда блок подходит к экрану,
   рендерят только когда видимы и движутся. Ось выключена — сцена не строится и ничего не грузит.
   Без WebGL (программный растр, reduced-motion, ошибка): статичные кадры той же сцены (img/3d/*.webp). */
(() => {
  'use strict';
  const GV = (window.GV = window.GV || {});
  if (GV.scenes) return;
  const D = document, R = D.documentElement, W = window;
  const STILL = { a: '{{asset:img/3d/sign-a.webp}}', b: '{{asset:img/3d/sign-b.webp}}', roll: '{{asset:img/3d/roll.webp}}' };
  const mq = (s) => (W.matchMedia ? W.matchMedia(s) : { matches: false });
  const RMQ = mq('(prefers-reduced-motion: reduce)'), NARROWQ = mq('(max-width: 767px)');
  const Q = new URLSearchParams(location.search);
  const SHOT = R.dataset.shot === '1' || Q.get('shot') === '1';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const damp = (x, t, l, dt) => x + (t - x) * (1 - Math.exp(-l * dt));
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const now = () => performance.now();
  const gl = () => GV.gl;

  /* общее для двух сцен: место, видимость, буфер, фолбэк, ленивое построение */
  function Scene(kind, root, cv, opt) {
    const S = { kind, root, cv, vis: false, w: 0, h: 0, top: 0, hgt: 0, vh: 1, dpr: 1, last: null, state: 'idle', first: false, v: null };
    S.measure = () => {
      const r = opt.box.getBoundingClientRect(), sy = W.scrollY || 0, vr = cv.getBoundingClientRect();
      S.w = cv.offsetWidth || vr.width; S.h = cv.offsetHeight || vr.height; S.vh = innerHeight;
      S.top = r.top + sy; S.hgt = r.height;
      const dpr = Math.min(W.devicePixelRatio || 1, 2);
      S.dpr = S.w * S.h * dpr * dpr > opt.maxPx ? Math.sqrt(opt.maxPx / Math.max(1, S.w * S.h)) : dpr;   // потолок пикселей буфера
      S.last = null;
    };
    S.setState = (st) => { S.state = st; root.dataset.state = st; };
    S.draw = (p) => {
      if (!S.v || S.state !== 'gl' || !S.vis || S.w < 4) return;
      const bw = Math.round(S.w * S.dpr), bh = Math.round(S.h * S.dpr), key = JSON.stringify(p), L = S.last;
      if (L && L.k === key && L.w === bw && L.h === bh) return;
      if (S.v.pose(p, bw, bh)) {
        S.last = { k: key, w: bw, h: bh };
        if (!S.first) { S.first = true; root.classList.add('is-live'); }   // первый кадр готов — статичный кадр уходит
      }
    };
    const load = (sel) => root.querySelectorAll(sel).forEach((im) => { if (im.dataset.src) { im.src = im.dataset.src; im.removeAttribute('data-src'); } });
    // фолбэк: статичные кадры; картинки грузятся только здесь (или как заглушка на время компиляции)
    S.off = () => {
      if (S.state === 'off') return;
      S.setState('off'); load('img[data-src]');
      if (!(S.v && S.v.sent)) cv.remove();
    };
    S.want = () => {
      if (S.state !== 'idle') return;
      S.setState('wait'); load('img[data-ph]');
      gl().needScene(kind, (ok) => {
        if (!ok) { S.off(); return; }
        S.v = gl().view(kind, cv); S.setState('gl'); S.measure(); gl().wake();
      });
    };
    return S;
  }
  function watch(S, el) {
    if (!W.IntersectionObserver) { S.vis = true; S.want(); return; }
    new IntersectionObserver((es) => { for (const e of es) { S.vis = e.isIntersecting; if (S.vis) { S.last = null; gl().wake(); } } }, { rootMargin: '60px' }).observe(el);
    // строим заранее: за полтора экрана до блока
    new IntersectionObserver((es, io) => { for (const e of es) if (e.isIntersecting) { S.want(); io.disconnect(); } }, { rootMargin: '150% 0px 150% 0px' }).observe(el);
  }

  /* ═════════════════════ ЗНАК ONE WAY or ANOTHER ═════════════════════ */
  function mountSign(stage) {
    if (stage.querySelector('.k2-sign')) return null;
    const root = D.createElement('div');
    root.className = 'k2-sign'; root.dataset.state = 'idle'; root.dataset.step = '1';
    root.innerHTML =
      '<div class="k2-sign__pin">' +
        '<div class="k2-sign__cap">' +
          '<p class="k2-sign__kicker">ONE WAY <i>or</i> ANOTHER</p>' +
          '<p class="k2-sign__l k2-sign__l1">Знак показывает одну&nbsp;дорогу.</p>' +
          '<p class="k2-sign__l k2-sign__l2">Мы знаем ещё&nbsp;одну.</p>' +
        '</div>' +
        '<div class="k2-sign__view" role="img" aria-label="Дорожный знак ONE WAY со стрелкой влево оборачивается на столбе: на обороте стикер GRiNCHiN и кусок ленты, после оборота стрелка смотрит вправо, а сверху баллоном написано OR ANOTHER">' +
          `<img class="k2-sign__still k2-sign__still--a" data-ph data-src="${STILL.a}" alt="" width="900" height="1000" decoding="async">` +
          `<img class="k2-sign__still k2-sign__still--b" data-src="${STILL.b}" alt="" width="900" height="1000" decoding="async">` +
          '<canvas class="k2-sign__cv" aria-hidden="true"></canvas>' +
        '</div>' +
      '</div>';
    (stage.querySelector('.bs-sign') || stage).appendChild(root);   // .bs-sign — sticky-кадр K4
    const cv = root.querySelector('canvas'), view = root.querySelector('.k2-sign__view');
    const S = Scene('sign', root, cv, { box: stage, maxPx: 2.6e6 });
    const M = { p: 0, play: -1, played: false, mob: NARROWQ.matches };
    // поза знака по прогрессу p: 0 → 1. Три такта: лицевая «←» уходит на оборот → оборот задерживается
    // (стикер GRiNCHiN и лента успевают прочитаться) → лицевая возвращается со стрелкой «→», граффити проявляется
    const pose = (p) => {
      const a1 = eio(sstep(0.06, 0.32, p)), a2 = sstep(0.32, 0.5, p), a3 = eio(sstep(0.5, 0.78, p));
      const ry = -0.32 + a1 * (Math.PI + 0.14) + a2 * 0.36 + a3 * (Math.PI + 0.12);
      const a = (ry + 0.32) / (TAU + 0.62);
      return {
        ry: +ry.toFixed(4), rx: +(Math.sin(a * Math.PI) * 0.07).toFixed(4), rz: +(Math.sin(a * TAU) * 0.018).toFixed(4),
        flip: ry > Math.PI, g: +sstep(0.8, 0.95, p).toFixed(3),
      };
    };
    function target() {
      if (M.mob) return M.play < 0 ? (M.played ? 1 : 0) : clamp((now() - M.play) / 2400, 0, 1);
      return clamp(((W.scrollY || 0) - S.top) / Math.max(1, S.hgt - S.vh), 0, 1);
    }
    function tick(dt) {
      const t = target();
      M.p = M.mob || SHOT || S.state === 'off' ? t : damp(M.p, t, 11, dt);
      if (Math.abs(M.p - t) < 0.0004) M.p = t;
      const st = M.p > 0.62 ? '2' : '1'; if (root.dataset.step !== st) root.dataset.step = st;
      S.draw(pose(M.p));
      const playing = M.mob && M.play >= 0 && now() - M.play < 2450;
      if (M.mob && M.play >= 0 && !playing) { M.play = -1; M.played = true; }
      return playing || Math.abs(M.p - t) > 0.0004;
    }
    function playOnce() {
      if (!M.mob || M.play >= 0 || RMQ.matches) return;
      M.play = now(); M.played = false; gl().wake();
    }
    // mobile: проиграть при входе (знак наполовину в кадре); тап по знаку — ещё раз
    if (W.IntersectionObserver) new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting && M.mob && !M.played) playOnce(); }, { threshold: 0.55 }).observe(view);
    view.addEventListener('click', () => { if (M.mob && M.played) playOnce(); });
    watch(S, root);
    const re = () => { M.mob = NARROWQ.matches; S.measure(); gl().wake(); };
    W.addEventListener('resize', re, { passive: true });
    if (W.ResizeObserver) new ResizeObserver(re).observe(stage);
    W.addEventListener('scroll', () => { if (S.vis) gl().wake(); }, { passive: true });
    S.measure();
    gl().loop(tick);
    gl().onOff(() => S.off());
    return S;
  }

  /* ═════════════════════ РУЛОН ЛЕНТЫ ═════════════════════ */
  function mountRoll(stage) {
    if (stage.querySelector('.k2-roll')) return null;
    const root = D.createElement('div');
    root.className = 'k2-roll'; root.dataset.state = 'idle';
    root.setAttribute('role', 'img');
    root.setAttribute('aria-label', 'Рулон фирменной ленты GRiNCHiN катится по асфальту и оставляет за собой полосу');
    root.innerHTML = `<img class="k2-roll__still" data-ph data-src="${STILL.roll}" alt="" width="1600" height="560" decoding="async"><canvas class="k2-roll__cv" aria-hidden="true"></canvas>`;
    stage.appendChild(root);
    const cv = root.querySelector('canvas');
    const S = Scene('roll', root, cv, { box: stage, maxPx: 2.4e6 });
    const M = { u: 0, play: -1, played: false, mob: NARROWQ.matches };
    function target() {
      if (M.mob) {
        if (M.play < 0) return M.played ? 0.97 : 0.02;
        return 0.02 + 0.95 * (1 - Math.pow(1 - clamp((now() - M.play) / 2600, 0, 1), 2.2));
      }
      // от «верх блока на 92 % экрана» до «низ блока на 40 %»
      const y0 = S.top - S.vh * 0.92, y1 = S.top + S.hgt - S.vh * 0.4;
      return 0.02 + 0.95 * clamp(((W.scrollY || 0) - y0) / Math.max(1, y1 - y0), 0, 1);
    }
    function tick(dt) {
      if (S.state === 'off') return false;
      const t = target();
      M.u = M.mob || SHOT ? t : damp(M.u, t, 9, dt);
      if (Math.abs(M.u - t) < 0.0004) M.u = t;
      S.draw({ u: +M.u.toFixed(4), fl: +(M.u * 34).toFixed(3) });
      const playing = M.mob && M.play >= 0 && now() - M.play < 2650;
      if (M.mob && M.play >= 0 && !playing) { M.play = -1; M.played = true; }
      return playing || Math.abs(M.u - t) > 0.0004;
    }
    if (W.IntersectionObserver) new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting && M.mob && !M.played && M.play < 0 && !RMQ.matches) { M.play = now(); gl().wake(); }
    }, { threshold: 0.6 }).observe(root);
    watch(S, root);
    const re = () => { M.mob = NARROWQ.matches; S.measure(); gl().wake(); };
    W.addEventListener('resize', re, { passive: true });
    if (W.ResizeObserver) new ResizeObserver(re).observe(stage);
    W.addEventListener('scroll', () => { if (S.vis) gl().wake(); }, { passive: true });
    S.measure();
    gl().loop(tick);
    gl().onOff(() => S.off());
    return S;
  }

  const OUT = { sign: null, roll: null };
  function boot() {
    if (!gl()) return;
    const brand = R.dataset.brand || 'sign', roll = R.dataset.roll || 'on';
    const bs = D.getElementById('brand-stage'), rs = D.getElementById('roll-stage');
    if (brand === 'sign' && bs) OUT.sign = mountSign(bs);
    if (roll === 'on' && rs) OUT.roll = mountRoll(rs);
    if ((OUT.sign || OUT.roll) && (SHOT || RMQ.matches)) gl().start();   // WebGL не запускается — сразу статичные кадры
  }
  GV.scenes = {
    v: 3, state: OUT,
    refresh: () => { for (const k in OUT) if (OUT[k]) OUT[k].measure(); if (gl()) gl().wake(); },
  };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
  W.addEventListener('load', () => GV.scenes.refresh());
  if (D.fonts && D.fonts.ready) D.fonts.ready.then(() => GV.scenes.refresh());
})();
