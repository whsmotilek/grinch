/* GRINCHIN v4 · S1 · «Дроп на вешалках» — модуль главного потока.
   Две концепции (ось/параметр concept):
   · rail  — «Рейл»: хромированная труба через экран с выгибом к зрителю; 8 вещей на вешалках (верх — плечики
             с крючком, низ — брючная с зажимами). Свайп/драг/колесо по X/стрелки двигают вещи по трубе, вещь
             в фокусе стоит на выгибе (ближе всех) и медленно вращается, соседи покачиваются от разгона.
   · chain — «Цепь»: одна вещь на цепи с карабином, обмотанным лаймовым скотчем; драг раскручивает её
             (вертлюг с трением), смена вещи — старая уезжает вверх, новая спускается и пружинит.
   Здесь — данные, раскладка, вся физика (поза считается тут, воркер только рисует), жесты, подписи, очередь загрузки.
   3D — rack-scene.js (в Web Worker, один WebGL-контекст; в сайте — общий GV.gl, см. README).
   API: GV.rack.mount(el, opts) → экземпляр {go, next, prev, focus, concept, stats, bench, destroy}. */
(() => {
  'use strict';
  const GV = (window.GV = window.GV || {});
  if (GV.rack) return;
  const D = document, W = window;
  const Q = new URLSearchParams(location.search);
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const damp = (x, t, l, dt) => x + (t - x) * (1 - Math.exp(-l * dt));
  const sm = (t) => t * t * (3 - 2 * t);
  const wrapPI = (a) => a - TAU * Math.round(a / TAU);
  const now = () => performance.now();
  const mq = (s) => (W.matchMedia ? W.matchMedia(s) : { matches: false, addEventListener() {} });
  const RMQ = mq('(prefers-reduced-motion: reduce)');
  const NARROW = mq('(max-width: 767px)');
  const URLS = {
    three: ['https://cdnjs.cloudflare.com/ajax/libs/three.js/0.186.1/three.module.min.js', 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.min.js'],
    addons: ['https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/', 'https://unpkg.com/three@0.186.1/examples/jsm/'],
  };
  const LIME = '#8ED308';

  /* Как висит каждая вещь. h — высота заглушки/модели при авто-раскладке, top — где её верх относительно
     «плеч/пояса» (y=0: капюшон выше плеч), back — есть фото спины. */
  const KIND = {
    'jeans-restart': { part: 'bottom', h: 1.08, top: 0.0 },
    'suit-detour': { part: 'set', h: 1.5, top: 0.1, back: true },
    'jeans-scribble': { part: 'bottom', h: 1.08, top: 0.0, back: true },
    'hoodie-crack': { part: 'top', h: 0.8, top: 0.14, back: true },
    'jacket-biker': { part: 'top', h: 0.76, top: 0.13 },
    'jeans-redline': { part: 'bottom', h: 1.1, top: 0.0 },
    'tee-blank': { part: 'top', h: 0.72, top: 0.03 },
    'longsleeve-blank': { part: 'top', h: 0.74, top: 0.03 },
  };
  // пропорции фото «призрачного манекена» (ширина/высота) — для раскладки ряда-фолбэка до загрузки картинок
  const FB_A = { 'jeans-restart': 0.49, 'jeans-scribble': 0.66, 'jeans-redline': 0.5, 'tee-blank': 0.93, 'longsleeve-blank': 0.82, 'hoodie-crack': 0.76, 'jacket-biker': 0.78, 'suit-detour': 0.42 };
  // вешалка для CSS-фолбэка: крючок, плечики; у брючной — перекладина с двумя зажимами
  function hangerSVG(part) {
    const hook = '<path d="M50 3c-5 0-8 3-8 7s3 6 8 7v9" fill="none" stroke="#cfcfcf" stroke-width="2.6" stroke-linecap="round"/>';
    const body = part === 'bottom'
      ? '<path d="M50 26 22 44h56z" fill="none" stroke="#1c1c1c" stroke-width="3" stroke-linejoin="round"/><path d="M18 46h64" stroke="#d4d4d4" stroke-width="3.4" stroke-linecap="round"/><rect x="26" y="46" width="7" height="12" fill="#111"/><rect x="67" y="46" width="7" height="12" fill="#111"/>'
      : '<path d="M50 26 8 54c-3 2-2 5 2 5h80c4 0 5-3 2-5z" fill="none" stroke="#1c1c1c" stroke-width="3.2" stroke-linejoin="round"/>';
    return '<svg class="rk-fb-hg" viewBox="0 0 100 64" preserveAspectRatio="xMidYMin meet" aria-hidden="true">' + hook + body + '</svg>';
  }
  const ORDER = ['jeans-restart', 'jeans-scribble', 'jeans-redline', 'tee-blank', 'longsleeve-blank', 'hoodie-crack', 'jacket-biker', 'suit-detour'];
  const rank = (id) => { const k = ORDER.indexOf(id); return k < 0 ? 99 : k; };
  const OFF = { top: -0.168, set: -0.168, bottom: -0.216 };   // = rack-scene.js
  const RAIL = { A: 0.6, W: 0.72 };                            // выгиб трубы: z = A·exp(−(x/W)²)
  const railZ = (x) => RAIL.A * Math.exp(-(x / RAIL.W) * (x / RAIL.W));
  const railDZ = (x) => railZ(x) * (-2 * x) / (RAIL.W * RAIL.W);

  /* ═════════ ленты (рисуются на главном потоке — здесь есть шрифты), уходят в воркер ImageBitmap'ами ═════════ */
  function canvas(w, h) { const c = D.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tornPath(g, w, h, seed, lw) {
    let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const p = lw / 2;
    g.beginPath(); g.moveTo(p, p); g.lineTo(w * 0.86, p);
    const n = 6;
    for (let k = 1; k <= n; k++) g.lineTo(w - p - (k % 2 ? r() * w * 0.07 : 0) - w * 0.02, p + ((h - 2 * p) * k) / n);
    g.lineTo(p, h - p); g.closePath();
  }
  function tape(w, h, fill, ink, seed, draw, flip) {
    const c = canvas(w, h), g = c.getContext('2d'), lw = Math.round(h * 0.085);
    const path = () => { g.save(); if (flip) { g.translate(w, 0); g.scale(-1, 1); } tornPath(g, w, h, seed, lw); g.restore(); };
    path();
    g.fillStyle = fill; g.fill();
    g.save(); g.clip();
    g.fillStyle = 'rgba(255,255,255,.34)'; g.fillRect(0, h * 0.16, w, h * 0.09);     // блик
    g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(0, h * 0.78, w, h * 0.22);           // плоская тень
    if (draw) draw(g, ink);
    g.restore();
    g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = '#000'; path(); g.stroke();
    return c;
  }
  async function makeTex(items, logo) {
    try { await Promise.race([D.fonts && D.fonts.load('800 60px Unbounded'), new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* noop */ }
    const font = (px) => '800 ' + px + 'px Unbounded, "Arial Black", system-ui, sans-serif';
    const num = (n) => (g, ink) => { g.fillStyle = ink; g.font = font(62); g.textBaseline = 'middle'; g.fillText(String(n).padStart(2, '0'), 30, 104 / 2 + 3); };
    const bmp = (c) => createImageBitmap(c, { imageOrientation: 'flipY', premultiplyAlpha: 'none' });
    const tags = await Promise.all(items.map(async (it, i) => ({
      on: await bmp(tape(256, 104, LIME, '#000', 11 + i * 7, num(it.n))),
      off: await bmp(tape(256, 104, '#262626', '#d8d8d4', 11 + i * 7, num(it.n))),
    })));
    const bc = canvas(128, 32), bg = bc.getContext('2d');
    bg.fillStyle = LIME; bg.fillRect(0, 0, 128, 32);
    bg.fillStyle = 'rgba(255,255,255,.45)'; bg.fillRect(70, 0, 10, 32);
    bg.fillStyle = 'rgba(0,0,0,.16)'; bg.fillRect(0, 0, 22, 32); bg.fillRect(110, 0, 18, 32);
    const car = tape(512, 176, LIME, '#000', 5, (g, ink) => {
      if (!logo) { g.fillStyle = ink; g.font = font(70); g.textBaseline = 'middle'; g.fillText('GRiNCHiN', 40, 92); return; }
      const B = logo.box, hh = 108, s = hh / (B[3] - B[1]);
      g.save(); g.translate(62, (176 - hh) / 2 + 4); g.scale(s, s); g.translate(-B[0], -B[1]); g.fillStyle = ink;
      logo.paths.forEach((d) => g.fill(new Path2D(d))); g.restore();
    }, true);
    return { band: await bmp(bc), car: await bmp(car), tags };
  }

  /* ═════════ движок: один на страницу ═════════
     shared — общий движок сайта GV.gl (three-g.js, одна WebGL-сцена «rack» в том же воркере и контексте, что G/знак/рулон;
              нужен хук GV.gl.ext/xmsg — см. README); worker — свой воркер (прототип, или сайт без хука); main — главный поток.
     Все экземпляры (блок на странице и вкладка «3D» в карточке) делят один движок и одну очередь загрузки:
     поза полная и без состояния, поэтому одна сцена рисуется в несколько холстов. */
  function factorySrc() {   // исходник фабрики сцены для общего движка: (T, {renderer}) → сцена
    return `(function () {
const RACK_LOAD = ${W.GV_RACK_LOAD.toString()};
const RACK_SCENE = ${W.GV_RACK_SCENE.toString()};
return async function (T, c) { const L = await RACK_LOAD({ T, addons: ${JSON.stringify(URLS.addons)} }); return RACK_SCENE(L.T, L.X, { renderer: c.renderer }); };
})()`;
  }
  function workerSrc() {
    return `'use strict';
const RACK_LOAD = ${W.GV_RACK_LOAD.toString()};
const RACK_SCENE = ${W.GV_RACK_SCENE.toString()};
let S = null, pend = false;
const V = new Map(), P = new Map();
const raf = self.requestAnimationFrame ? (f) => self.requestAnimationFrame(f) : (f) => setTimeout(f, 0);
function draw() {
  pend = false; if (!S) return;
  for (const [id, q] of P) {
    const v = V.get(id); if (!v || !S.render(q.p, q.w, q.h)) continue;
    if (v.c.width !== q.w || v.c.height !== q.h) { v.c.width = q.w; v.c.height = q.h; }
    v.x.transferFromImageBitmap(S.canvas.transferToImageBitmap());
  }
  P.clear();
}
self.onmessage = async (ev) => {
  const m = ev.data;
  if (m.t === 'init') {
    try {
      const probe = new OffscreenCanvas(1, 1);
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) { postMessage({ t: 'nogl' }); return; }
      const L = await RACK_LOAD(m.urls);
      S = RACK_SCENE(L.T, L.X, Object.assign({ canvas: new OffscreenCanvas(2, 2) }, m.o));
      postMessage({ t: 'built', gpu: S.gpu });
    } catch (e) { postMessage({ t: 'off', msg: String((e && e.message) || e) }); }
    return;
  }
  if (!S) return;
  if (m.t === 'view') V.set(m.id, { c: m.canvas, x: m.canvas.getContext('bitmaprenderer') });
  else if (m.t === 'pose') { P.set(m.id, m); if (!pend) { pend = true; raf(draw); } }
  else if (m.t === 'msg') {
    try { postMessage({ t: 'res', q: m.q, r: await S.msg(m.m) }); }
    catch (e) { postMessage({ t: 'res', q: m.q, err: String((e && e.message) || e) }); }
  }
};`;
  }
  const HUB = {
    st: 'idle', kind: '', why: '', gpu: '', insts: new Set(), q: 0, cb: new Map(), wk: null, S: null, uid: 0,
    load: { busy: false, done: {}, fail: {} }, cfg: null,
  };
  function hubEmit() { HUB.insts.forEach((i) => i._hub(HUB.st)); }
  function hubOff(why) { if (HUB.st === 'off') return; HUB.st = 'off'; HUB.why = why || ''; console.info('[rack] без WebGL: ' + HUB.why); if (HUB.wk) { HUB.wk.terminate(); HUB.wk = null; } hubEmit(); }
  function hubMsg(m, transfer) {
    if (HUB.kind === 'shared') return W.GV.gl.xmsg('rack', m, transfer);
    if (HUB.kind === 'worker') return new Promise((res, rej) => { const q = ++HUB.q; HUB.cb.set(q, [res, rej]); HUB.wk.postMessage({ t: 'msg', q, m }, transfer || []); });
    return HUB.S.msg(m);
  }
  function hubStart(cfg) {
    if (HUB.st !== 'idle') return;
    HUB.cfg = cfg; HUB.st = 'loading';
    const R = D.documentElement, gl = GV.gl;
    const shot = R.dataset.shot === '1' || Q.get('shot') === '1';
    if (Q.has('nogl') || shot) { hubOff(shot ? 'shot' : 'nogl'); return; }
    const setup = () => makeTex(cfg.items, cfg.logo).then((tex) => {
      const transfer = [tex.band, tex.car].concat(...tex.tags.map((t) => [t.on, t.off]));
      return hubMsg({ t: 'setup', s: { items: cfg.items.map((it) => ({ id: it.id, n: it.n, part: it.part, h: it.h, top: it.top })), rail: RAIL, tex } }, transfer);
    }).then(() => { HUB.st = 'ok'; hubEmit(); }, (e) => hubOff('setup: ' + ((e && e.message) || e)));
    // общий движок сайта: тот же воркер и контекст, что у G/знака/рулона
    if (gl && typeof gl.ext === 'function' && typeof gl.xmsg === 'function' && !Q.has('ownctx')) {
      HUB.kind = 'shared';
      gl.start();
      let n = 0;
      const wait = () => {
        const st = gl.state();
        if (st === 'off') { hubOff('gl: ' + (gl.why || 'off')); return; }
        if (st !== 'ok') { if (++n > 300) hubOff('gl: timeout'); else setTimeout(wait, 100); return; }
        gl.ext('rack', factorySrc());
        gl.needScene('rack', (ok, why) => { if (!ok) { hubOff('gl: ' + (why || 'scene')); return; } HUB.gpu = gl.engine; setup(); });
      };
      wait();
      return;
    }
    // политика v3: в сайте при reduced-motion / слабом устройстве WebGL не поднимаем (статичные фото)
    if (gl) {
      const c = navigator.connection;
      if (RMQ.matches) { hubOff('reduced-motion'); return; }
      if ((c && c.saveData) || (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2)) { hubOff('weak'); return; }
      console.info('[rack] GV.gl без хука ext — своя сцена в отдельном воркере (второй контекст), см. README');
    }
    const o = { aa: Math.min(W.devicePixelRatio || 1, 2) < 2, soft: Q.has('soft') || cfg.soft === true };
    const canWorker = !Q.has('glmain') && typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' &&
      !!(W.HTMLCanvasElement && HTMLCanvasElement.prototype.transferControlToOffscreen) && typeof ImageBitmapRenderingContext !== 'undefined';
    const main = () => {   // запасной путь: Safari < 17 и т. п.
      HUB.kind = 'main';
      const cv = D.createElement('canvas'); cv.width = cv.height = 2;
      W.GV_RACK_LOAD(URLS).then((L) => { HUB.S = W.GV_RACK_SCENE(L.T, L.X, Object.assign({ canvas: cv }, o)); HUB.gpu = HUB.S.gpu; return setup(); })
        .catch((e) => hubOff(String((e && e.message) || e)));
    };
    if (!canWorker) { main(); return; }
    try {
      HUB.kind = 'worker';
      const wk = (HUB.wk = new Worker(URL.createObjectURL(new Blob([workerSrc()], { type: 'text/javascript' })), { type: 'module' }));
      wk.onmessage = (ev) => {
        const m = ev.data;
        if (m.t === 'nogl') { wk.terminate(); HUB.wk = null; main(); }
        else if (m.t === 'off') hubOff(m.msg);
        else if (m.t === 'built') { HUB.gpu = m.gpu; setup(); }
        else if (m.t === 'res') { const f = HUB.cb.get(m.q); if (f) { HUB.cb.delete(m.q); if (m.err) f[1](new Error(m.err)); else f[0](m.r); } }
      };
      wk.onerror = (e) => hubOff('worker: ' + (e.message || ''));
      wk.postMessage({ t: 'init', urls: URLS, o });
    } catch (e) { HUB.wk = null; main(); }
  }
  // вид — холст экземпляра; в воркер уходит при первом кадре
  function hubView(canvas) {
    if (HUB.kind === 'shared') {
      const v = W.GV.gl.view('rack', canvas);
      return { pose: (p, w, h) => v.pose(p, w, h) };
    }
    const id = ++HUB.uid; let sent = false, x2d = null;
    return {
      pose(p, w, h) {
        if (HUB.st !== 'ok') return false;
        if (HUB.kind === 'worker') {
          if (!sent) { const off = canvas.transferControlToOffscreen(); HUB.wk.postMessage({ t: 'view', id, canvas: off }, [off]); sent = true; }
          HUB.wk.postMessage({ t: 'pose', id, p, w, h });
        } else {
          if (!HUB.S.render(p, w, h)) return false;
          if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; x2d = null; }
          const x = x2d || (x2d = canvas.getContext('2d')); x.clearRect(0, 0, w, h); x.drawImage(HUB.S.canvas, 0, 0);
        }
        return true;
      },
    };
  }
  function hubStats() {
    if (HUB.st !== 'ok') return Promise.resolve(null);
    if (HUB.kind === 'shared') return Promise.all([W.GV.gl.stats(), hubMsg({ t: 'info' }).catch(() => null)]).then(([a, b]) => (a || b ? Object.assign({}, b || {}, a || {}, { loaded: b && b.loaded, gpu: (b && b.gpu) || HUB.gpu }) : null));
    return Promise.race([hubMsg({ t: 'info' }), new Promise((r) => setTimeout(() => r(null), 1500))]);
  }
  // очередь загрузки: одна на страницу; задачи берутся у самого «свежего» видимого экземпляра
  function hubPump() {
    const L = HUB.load;
    if (HUB.st !== 'ok' || L.busy) return;
    const list = [...HUB.insts].filter((i) => i._live()).sort((a, b) => b._active() - a._active());
    for (const inst of list) {
      for (const t of inst._tasks()) {
        const key = t.id + ':' + t.kind;
        if (L.done[key] || L.fail[key] || (t.kind === 'stub' && L.done[t.id + ':glb'])) continue;
        if (!t.src) { L.fail[key] = 'нет файла'; continue; }
        L.busy = true;
        hubMsg({ t: 'load', id: t.id, kind: t.kind, src: t.src, meta: t.meta }).then((r) => {
          L.done[key] = r; L.busy = false;
          HUB.insts.forEach((i) => i._loaded(t.id, t.kind, r));
          if (t.kind === 'full') hubFullGC();
          hubPump();
        }, (e) => { L.fail[key] = String((e && e.message) || e); L.busy = false; console.warn('[rack] не загрузилось', key, L.fail[key]); hubPump(); });
        return;
      }
    }
  }
  // полные модели держим только у тех вещей, что нужны какому-то экземпляру (фокус, на десктопе — соседи); остальные выгружаем
  function hubFullGC() {
    if (HUB.st !== 'ok') return;
    const keep = new Set(); HUB.insts.forEach((i) => i._keep().forEach((id) => keep.add(id)));
    for (const key of Object.keys(HUB.load.done)) {
      if (!key.endsWith(':full')) continue;
      const id = key.slice(0, -5); if (keep.has(id)) continue;
      delete HUB.load.done[key];
      hubMsg({ t: 'drop', id }).then(() => HUB.insts.forEach((i) => i._loaded(id, 'drop', null)), () => {});
    }
  }
  // один цикл на модуль: крутится, пока кому-то есть что двигать
  const LOOP = { fns: new Set(), on: false, last: 0 };
  function loopStep(t) {
    const dt = clamp((t - (LOOP.last || t - 16.7)) / 1000, 0.001, 0.05); LOOP.last = t;
    let busy = false;
    for (const f of LOOP.fns) { try { if (f(dt, t)) busy = true; } catch (e) { console.warn('[rack]', e); } }
    if (busy) requestAnimationFrame(loopStep); else { LOOP.on = false; LOOP.last = 0; }
  }
  function loopWake() { if (LOOP.on) return; LOOP.on = true; requestAnimationFrame(loopStep); }

  /* ═════════ экземпляр ═════════ */
  function mount(el, opts) {
    opts = Object.assign({ concept: 'rail', drive: 'drag', ui: 'full', start: null, products: W.GV_PRODUCTS || [], drop: W.GV_DROP || {}, title: 'Дроп на вешалках' }, opts || {});
    opts.models = Object.assign({}, ASSETS.models, opts.models || {});
    opts.stubs = Object.assign({}, ASSETS.stubs, opts.stubs || {});
    const BARE = opts.ui === 'bare';   // вкладка «3D» в карточке: только сцена, подпись даёт карточка
    // порядок на рейле (отзыв v4.1): джинсы → футболки → верх → костюм целиком; номер на скотче — место на рейле
    const PR = opts.products.slice().sort((a, b) => rank(a.id) - rank(b.id)), N = PR.length;
    const items = PR.map((p, i) => Object.assign({ id: p.id, n: i + 1, i }, KIND[p.id] || { part: /джинс|брюк|штан/i.test(p.type) ? 'bottom' : 'top', h: 0.8, top: 0.05 }));
    const startIdx = Math.max(0, PR.findIndex((p) => p.id === opts.start));
    const RM = () => RMQ.matches;
    const LOGO = (GV.gl && GV.gl.LOGO) ? { paths: GV.gl.LOGO, box: GV.gl.LOGO_BOX } : W.GV_RACK_LOGO || null;
    const pad = (n) => String(n).padStart(2, '0');
    const money = (v) => v.toLocaleString('ru-RU').replace(/\s/g, ' ') + ' ₽';

    /* ── разметка ── */
    el.classList.add('rk');
    el.dataset.concept = opts.concept === 'chain' ? 'chain' : 'rail';
    el.dataset.drive = opts.drive === 'scroll' ? 'scroll' : 'drag';
    el.dataset.gl = 'wait';
    el.dataset.ui = BARE ? 'bare' : 'full';
    el.style.setProperty('--rk-n', N);
    el.innerHTML = `
<div class="rk-pin">
  <div class="rk-stage" tabindex="0" role="region" aria-roledescription="карусель" aria-label="${opts.title}: ${N} вещей. Стрелки влево и вправо — листать.">
    <canvas class="rk-cv" aria-hidden="true"></canvas>
    <div class="rk-fb" aria-hidden="true"><div class="rk-fb-rail"></div><div class="rk-fb-row">${PR.map((p, i) => (opts.stubs[p.id] && opts.stubs[p.id][0] && (!BARE || i === startIdx)) ? `<figure class="rk-fb-it" data-i="${i}" style="--rk-a:${FB_A[p.id] || 0.6}">${hangerSVG(items[i].part)}<span class="rk-fb-tag">${pad(i + 1)}</span><img data-i="${i}" data-src="${opts.stubs[p.id][0]}" alt="" decoding="async"></figure>` : '').join('')}</div></div>
    <p class="rk-hint" aria-hidden="true"><span class="rk-hint-rail">${opts.drive === 'scroll' ? 'листай ↓ или тяни ← →' : 'тяни ← →'}</span><span class="rk-hint-chain">крути ← →</span></p>
    <button class="rk-arr rk-prev" type="button" aria-label="Предыдущая вещь"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
    <button class="rk-arr rk-next" type="button" aria-label="Следующая вещь"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
  </div>
  <header class="rk-top">
    <p class="rk-kicker">${opts.drop.name || 'Дроп'} · ${N} вещей</p>
    <div class="rk-switch" role="group" aria-label="Как показывать">
      <button type="button" data-c="rail">Рейл</button><button type="button" data-c="chain">Цепь</button>
    </div>
  </header>
  <section class="rk-info" aria-live="polite" aria-atomic="true">
    <p class="rk-num"><b class="rk-n"></b><span class="rk-of"> / ${pad(N)}</span> · <span class="rk-type"></span></p>
    <h3 class="rk-word"></h3>
    <p class="rk-meta"><span class="rk-color"></span><span class="rk-state"></span></p>
    <div class="rk-buy"><span class="rk-price"></span><button class="rk-add" type="button">В корзину</button></div>
  </section>
  <nav class="rk-index" aria-label="Все вещи">${PR.map((p, i) => `<button type="button" data-i="${i}" aria-label="${pad(items[i].n)} — ${p.type} ${p.word}"><b>${pad(items[i].n)}</b><span>${p.type}</span></button>`).join('')}</nav>
  <p class="rk-toast" role="status"></p>
  <pre class="rk-debug" hidden></pre>
</div>`;
    const $ = (s) => el.querySelector(s);
    const stage = $('.rk-stage'), cv = $('.rk-cv'), fbRow = $('.rk-fb-row'), info = $('.rk-info'), idx = [...el.querySelectorAll('.rk-index button')];
    const dbg = $('.rk-debug');
    if (Q.has('debug')) dbg.hidden = false;

    /* ── состояние ── */
    const S = {
      concept: el.dataset.concept, focus: startIdx, shown: -1,
      r: startIdx, rv: 0, rt: startIdx, accPrev: 0,
      sw: items.map(() => ({ a: 0, v: 0, spin: 0 })),
      drag: null, lastInput: -1e9, t: 0,
      rig: [{ idx: startIdx, dy: 0, dyv: 0, yaw: 0, yv: 0, sx: 0, sxv: 0, sz: 0, szv: 0, st: 'hang' }, { idx: -1, dy: 3, dyv: 0, yaw: 0, yv: 0, sx: 0, sxv: 0, sz: 0, szv: 0, st: 'off' }],
      act: 0,
      cam: null, w: 2, h: 2, dpr: Math.min(W.devicePixelRatio || 1, 2), dprK: 1,
      visible: false, eng: null, ready: false,
      load: { busy: false, done: {}, fail: {}, have: {} },
      fps: { n: 0, t0: 0, v: 0, slow: 0 },
    };

    /* ── подпись ── */
    function renderInfo(i, instant) {
      if (S.shown === i) return;
      const p = PR[i], it = items[i];
      const put = () => {
        $('.rk-n').textContent = pad(it.n);
        $('.rk-type').textContent = p.type;
        $('.rk-word').textContent = p.word;
        $('.rk-color').textContent = p.color;
        const sold = p.state === 'soldout';
        $('.rk-state').textContent = sold ? 'разобрали' : p.state === 'preorder' ? 'предзаказ · отправка с ' + (opts.drop.shipFrom || '—') : '';
        $('.rk-price').textContent = money(p.price);
        const add = $('.rk-add');
        add.disabled = sold; add.textContent = sold ? 'Разобрали' : 'В корзину';
        add.setAttribute('aria-label', sold ? p.name + ' — разобрали' : 'В корзину: ' + p.name + ', ' + money(p.price));
        info.dataset.id = p.id;
        idx.forEach((b, k) => { b.classList.toggle('is-on', k === i); b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
        // без WebGL: ряд фото на CSS-рейке, вещь в фокусе по центру
        fbFocus(i);
        info.classList.remove('is-out');
      };
      S.shown = i;
      if (instant || RM() || S.shown < 0) put();
      else { info.classList.add('is-out'); clearTimeout(S.infoT); S.infoT = setTimeout(put, 140); }
      el.dispatchEvent(new CustomEvent('grinchin:rack-focus', { bubbles: true, detail: { id: p.id, index: i } }));
    }

    /* ── камера ── */
    function bottomOf(i) { const it = items[i]; return (OFF[it.part] || OFF.top) - (it.drop || 0) - (it.bot != null ? it.bot : it.h - it.top); }
    function camFit(dt) {
      const asp = S.w / S.h, narrow = NARROW.matches || asp < 0.95, fov = 28, th = Math.tan((fov * Math.PI) / 360);
      const chain = S.concept === 'chain';
      const fi = chain ? Math.max(0, S.rig[S.act].idx) : clamp(Math.round(S.r), 0, N - 1);
      let top = chain ? (BARE ? 0.16 : 0.3) : 0.1, bot = chain ? bottomOf(fi) - 0.06 : Math.min(bottomOf(fi), -1.31) - 0.05;
      // доля кадра под вещь: на desktop снизу полоса индекса и подпись, сверху шапка
      const pt = BARE ? 0.03 : narrow ? (chain ? 0.1 : 0.15) : chain ? 0.06 : 0.13, pb = BARE ? 0.09 : narrow ? 0.05 : chain ? 0.13 : 0.17, fv = 1 - pt - pb;
      const Hs = top - bot, Dv = Hs / (2 * th * fv);
      const Wv = chain ? (narrow ? 1.05 : 1.4) : narrow ? 1.18 : 2.4, Dw = Wv / (2 * th * asp);
      const Dt = Math.max(Dv, Dw);
      const ycT = (top + bot) / 2 - ((pb - pt) / 2) * 2 * Dt * th;
      const zf = chain ? 0 : RAIL.A;
      const C = S.cam || (S.cam = { D: Dt, yc: ycT });
      if (dt == null) { C.D = Dt; C.yc = ycT; } else { C.D = damp(C.D, Dt, 4, dt); C.yc = damp(C.yc, ycT, 4, dt); }
      C.fov = fov; C.z = zf + C.D; C.y = C.yc + 0.1; C.tz = zf; C.ty = C.yc;
      C.halfW = th * C.D * asp; C.th = th;
      return Math.abs(C.D - Dt) > 1e-4 || Math.abs(C.yc - ycT) > 1e-4;
    }
    function project(x, y, z) {   // точка мира → px на сцене (для попадания по вещи)
      const C = S.cam, px = 0, py = C.y, pz = C.z;
      let fx = 0 - px, fy = C.ty - py, fz = C.tz - pz; const fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
      let rx = -fz, rz = fx; const rl = Math.hypot(rx, rz); rx /= rl; rz /= rl;          // right = f × up
      const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;                          // up = r × f
      const dx = x - px, dy = y - py, dz = z - pz, cz = dx * fx + dy * fy + dz * fz;
      const cx = dx * rx + dz * rz, cy = dx * ux + dy * uy + dz * uz;
      const asp = S.w / S.h;
      return [((cx / (cz * C.th * asp)) + 1) / 2, (1 - cy / (cz * C.th)) / 2];
    }

    /* ── физика ── */
    const SP = () => (NARROW.matches ? 0.6 : 0.66), GAP = () => (NARROW.matches ? 0.34 : 0.2);   // на телефоне соседи только выглядывают
    // рейл замкнут в кольцо: за последней вещью снова идут первые — на краях листания нет пустой половины кадра
    const wrapD = (i, r) => { const d = i - r; return d - N * Math.round(d / N); };
    function railX(i, r) { const d = wrapD(i, r), ad = Math.abs(d); return d * SP() + Math.sign(d) * GAP() * sm(Math.min(ad, 1)); }
    function autoOn() { return !RM() && S.visible && !D.hidden && opts.auto !== false; }
    function stepRail(dt) {
      let busy = false;
      if (!S.drag) {
        const w = 8.5, a = w * w * (S.rt - S.r) - 2 * w * S.rv;
        S.rv += a * dt; S.r += S.rv * dt;
        if (RM() && Math.abs(S.rt - S.r) < 0.02) { S.r = S.rt; S.rv = 0; }
      }
      const acc = clamp((S.rv - S.accPrev) / Math.max(dt, 1e-3), -60, 60); S.accPrev = S.rv;
      if (Math.abs(S.rt - S.r) > 5e-4 || Math.abs(S.rv) > 5e-4 || S.drag) busy = true;
      const f = clamp(Math.round(S.r), 0, N - 1);
      if (f !== S.focus) { S.focus = f; S.focusAt = now(); renderInfo(f); pump(); }
      if (S.drag || Math.abs(S.rv) > 0.08 || Math.abs(S.rt - S.r) > 0.08) { if (S.fullT) { clearTimeout(S.fullT); S.fullT = 0; } }
      else if (S.fullWant !== S.focus && !S.fullT) settle();
      const auto = autoOn();
      for (let i = 0; i < N; i++) {
        const q = S.sw[i], d = Math.abs(i - S.r);
        if (RM()) { q.a = 0; q.v = 0; q.spin = damp(q.spin, Math.round(q.spin / TAU) * TAU, 6, dt); }
        else {
          // маятник на крючке: разгон рейла раскачивает, трение гасит; «сквозняк» — едва заметно
          const breeze = auto ? 0.014 * Math.sin(S.t * 0.9 + i * 1.7) * (d < 0.5 ? 0.3 : 1) : 0;
          const a = -19.6 * (q.a - breeze) - 3.2 * q.v - clamp(acc, -14, 14) * SP() * 0.32;
          q.v += a * dt; q.a = clamp(q.a + q.v * dt, -0.2, 0.2);
          // фокус медленно крутится — но сначала 1,6 с стоит лицом: вещь не появляется в кадре боком
          if (i === f && auto && S.onScreen && !S.drag && Math.abs(S.rv) < 0.6 && now() - (S.focusAt || 0) > 1600 && now() - (S.onScreenAt || 0) > 1600) q.spin += 0.42 * dt;
          else if (i === f && !S.onScreen) q.spin = damp(q.spin, Math.round(q.spin / TAU) * TAU, 3, dt);   // вне экрана — вернуть лицом
          else if (i !== f) q.spin = damp(q.spin, Math.round(q.spin / TAU) * TAU, 2.2, dt);
          if (Math.abs(q.a) > 2e-4 || Math.abs(q.v) > 2e-4) busy = true;
        }
      }
      return busy || (auto && el.dataset.gl !== 'off');
    }
    function rigSwitch(n) {
      const cur = S.rig[S.act];
      if (cur.idx === n && cur.st !== 'up') return;
      const nx = S.rig[1 - S.act];
      cur.st = cur.idx >= 0 ? 'up' : 'off';
      Object.assign(nx, { idx: n, dy: RM() ? 0 : 2.4, dyv: 0, yaw: RM() ? 0 : -0.6, yv: 0, sx: 0, sxv: 0, sz: 0, szv: 0, st: RM() ? 'hang' : 'down', hit: false });
      if (RM()) Object.assign(cur, { idx: -1, st: 'off' });
      S.act = 1 - S.act;
      S.focus = n; renderInfo(n); pump();
    }
    function stepChain(dt) {
      let busy = false;
      const auto = autoOn();
      S.rig.forEach((g, k) => {
        if (g.idx < 0) return;
        if (k === S.act && g.st === 'hang' && S.fullWant !== S.focus && !S.fullT) settle();
        if (g.st === 'up') {
          g.dyv += 7 * dt; g.dy += g.dyv * dt; g.yaw += g.yv * dt;
          if (g.dy > 3.4) { g.idx = -1; g.st = 'off'; } else busy = true;
          return;
        }
        if (g.st === 'down') {   // спуск на пружине цепи: перелёт и пара отскоков
          const w = 6.2, a = w * w * (0 - g.dy) - 2 * 0.3 * w * g.dyv;
          g.dyv += a * dt; g.dy += g.dyv * dt;
          if (!g.hit && g.dy < 0.02) { g.hit = true; g.szv += 0.12; g.sxv -= 0.07; }
          if (Math.abs(g.dy) < 4e-4 && Math.abs(g.dyv) < 4e-3) { g.dy = 0; g.dyv = 0; g.st = 'hang'; }
          if (k === S.act && g.dy < 0.05 && S.fullWant !== S.focus && !S.fullT) settle();
          busy = true;
        }
        const drag = S.drag && k === S.act;
        if (!drag) {
          // вертлюг с трением: после раскрутки — плавная остановка; в авто — медленное вращение
          let a;
          if (auto && k === S.act && now() - S.lastInput > 1800) a = 0.9 * (0.38 - g.yv);
          else { const base = Math.round(g.yaw / TAU) * TAU; a = -1.25 * g.yv + (Math.abs(g.yv) < 1.6 ? 2.2 * wrapPI(base - g.yaw) : 0); }
          if (RM() && !drag) a = -6 * g.yv + 14 * wrapPI(Math.round(g.yaw / TAU) * TAU - g.yaw);
          g.yv += a * dt; g.yaw += g.yv * dt;
        }
        const ax = -3.9 * g.sx - 0.55 * g.sxv, az = -3.9 * g.sz - 0.55 * g.szv;
        g.sxv += ax * dt; g.sx += g.sxv * dt; g.szv += az * dt; g.sz += g.szv * dt;
        if (RM()) { g.sx = g.sz = g.sxv = g.szv = 0; }
        if (Math.abs(g.yv) > 1e-3 || Math.abs(wrapPI(g.yaw)) > 1e-3 || Math.abs(g.sx) + Math.abs(g.sz) > 1e-4 || Math.abs(g.sxv) + Math.abs(g.szv) > 1e-4) busy = true;
      });
      return busy || (auto && el.dataset.gl !== 'off');
    }

    /* ── поза → движок ── */
    const POSE = { m: 0, c: [0, 0, 4, 0, 0, 0, 28], it: new Array(N * 9).fill(0), r: [[-1, 0, 0, 0, 0], [-1, 0, 0, 0, 0]] };
    function pose() {
      const C = S.cam, chain = S.concept === 'chain';
      POSE.m = chain ? 1 : 0;
      POSE.c[0] = 0; POSE.c[1] = C.y; POSE.c[2] = C.z; POSE.c[3] = 0; POSE.c[4] = C.ty; POSE.c[5] = C.tz; POSE.c[6] = C.fov;
      if (chain) {
        S.rig.forEach((g, k) => { const o = POSE.r[k]; o[0] = g.idx; o[1] = g.dy; o[2] = g.yaw; o[3] = g.sx; o[4] = g.sz; });
      } else {
        const lim = C.halfW + 0.5;
        for (let i = 0; i < N; i++) {
          const k = i * 9, x = railX(i, S.r), d = wrapD(i, S.r), q = S.sw[i], fw = 1 - Math.min(1, Math.abs(d));
          const z = railZ(x);
          const face = Math.atan2(-x, C.z - z) * 0.9;
          const fan = -Math.sign(d) * 0.4 * sm(Math.min(Math.abs(d), 1));
          POSE.it[k] = x; POSE.it[k + 1] = 0; POSE.it[k + 2] = z;
          POSE.it[k + 3] = face + fan * (1 - fw) + q.spin;
          POSE.it[k + 4] = q.a; POSE.it[k + 5] = 0;
          POSE.it[k + 6] = Math.abs(x) < lim && Math.abs(d) < N / 2 - 0.45 ? 1 : 0;   // на стыке кольца вещь прячется, а не перепрыгивает на глазах
          POSE.it[k + 7] = fw;
          POSE.it[k + 8] = -Math.atan(railDZ(x));
        }
      }
      if (!S.view) S.view = hubView(cv);
      S.view.pose(POSE, Math.round(S.w * S.dpr * S.dprK), Math.round(S.h * S.dpr * S.dprK));
    }

    /* ── цикл: рендер по требованию ── */
    function frame(dt, t) {
      if (!live()) { S.fps.t0 = 0; S.fps.n = 0; return false; }
      S.t += dt;
      let busy = S.concept === 'chain' ? stepChain(dt) : stepRail(dt);
      if (camFit(dt)) busy = true;
      if (S.ready) pose();
      // замер и адаптивный DPR: если кадр стабильно дольше 22 мс — снижаем буфер ступенькой
      const F = S.fps; F.n++;
      if (!F.t0) F.t0 = t;
      else if (t - F.t0 > 1000) { F.v = (F.n * 1000) / (t - F.t0); F.n = 0; F.t0 = t; if (F.v < 40 && S.dprK > 0.85 && !Q.has('nodpr')) { if (++F.slow >= 3) { S.dprK = Math.max(0.85, S.dprK - 0.15); F.slow = 0; } } else F.slow = 0; if (!dbg.hidden) debug(); }
      if (!busy) { S.fps.t0 = 0; S.fps.n = 0; }
      return busy;
    }
    // живой = виден, вкладка активна и не закрыт оверлеем (карточка товара поверх блока)
    function live() { return S.visible && !D.hidden && !S.paused && !S.dead; }
    function wake() { if (live()) loopWake(); }
    LOOP.fns.add(frame);
    function poke() { S.lastInput = now(); el.classList.add('is-used'); wake(); }

    /* ── навигация ── */
    function go(i, how) {
      i = clamp(i | 0, 0, N - 1);
      if (opts.drive === 'scroll' && how !== 'scroll') {
        const pin = $('.rk-pin'), off = parseFloat(getComputedStyle(pin).top) || 0;
        const top = el.getBoundingClientRect().top + W.scrollY - off, total = el.offsetHeight - pin.offsetHeight;
        W.scrollTo({ top: top + (total * i) / Math.max(1, N - 1) + 1, behavior: RM() ? 'auto' : 'smooth' });
        return;
      }
      if (S.concept === 'chain') rigSwitch(i);
      else { S.rt = i; if (S.focus !== i && Math.abs(S.r - i) > 0.5) { /* подпись сменится по дороге */ } }
      poke();
    }
    const next = () => go(S.focus + 1), prev = () => go(S.focus - 1);
    function setConcept(c) {
      c = c === 'chain' ? 'chain' : 'rail';
      if (S.concept === c) return;
      S.concept = c; el.dataset.concept = c;
      el.querySelectorAll('.rk-switch button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.c === c)));
      if (c === 'chain') {
        S.rig[0] = Object.assign(S.rig[0], { idx: -1, st: 'off' }); S.rig[1] = Object.assign(S.rig[1], { idx: -1, st: 'off' });
        S.act = 0; const f = S.focus; S.rig[0].idx = -2; rigSwitch(f);
      } else { S.r = S.rt = S.focus; S.rv = 0; S.sw.forEach((q) => { q.a = 0; q.v = 0; q.spin = 0; }); }
      camFit(); poke();
      el.dispatchEvent(new CustomEvent('grinchin:rack-concept', { bubbles: true, detail: { concept: c } }));
    }
    el.querySelectorAll('.rk-switch button').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.c === S.concept));
      b.addEventListener('click', () => setConcept(b.dataset.c));
    });
    $('.rk-prev').addEventListener('click', prev);
    $('.rk-next').addEventListener('click', next);
    idx.forEach((b) => b.addEventListener('click', () => go(+b.dataset.i)));
    $('.rk-add').addEventListener('click', () => {
      const p = PR[S.focus];
      el.dispatchEvent(new CustomEvent('grinchin:rack-add', { bubbles: true, detail: { id: p.id } }));
      if (typeof GV.open === 'function') { GV.open('product', p.id); return; }   // в сайте — карточка с выбором размера
      toast('«' + p.name + '» — в корзину (прототип)');
    });
    function toast(s) { const t = $('.rk-toast'); t.textContent = s; t.classList.add('is-on'); clearTimeout(S.toastT); S.toastT = setTimeout(() => t.classList.remove('is-on'), 2200); }
    stage.addEventListener('keydown', (e) => {
      const k = e.key;
      if (BARE && (k === 'ArrowRight' || k === 'ArrowLeft')) { const g = S.rig[S.act]; g.yv = clamp(g.yv + (k === 'ArrowRight' ? 3 : -3), -12, 12); poke(); e.preventDefault(); return; }
      if (k === 'ArrowRight') next(); else if (k === 'ArrowLeft') prev();
      else if (k === 'Home') go(0); else if (k === 'End') go(N - 1);
      else return;
      e.preventDefault();
    });

    /* ── жесты: горизонталь — наша, вертикаль — странице (touch-action: pan-y) ── */
    stage.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button')) return;
      S.drag = null;
      S.ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, t: now(), r0: S.r, moved: false, hist: [[now(), e.clientX]] };
    });
    stage.addEventListener('pointermove', (e) => {
      const P = S.ptr; if (!P || P.id !== e.pointerId) return;
      const dx = e.clientX - P.x, dy = e.clientY - P.y;
      if (!P.moved) {
        if (Math.abs(dx) < 7) return;
        if (Math.abs(dy) > Math.abs(dx)) { S.ptr = null; return; }   // вертикальный свайп — это прокрутка страницы
        P.moved = true; try { stage.setPointerCapture(e.pointerId); } catch (er) { /* noop */ }
        S.drag = { x0: e.clientX, r0: S.r, yaw0: S.rig[S.act].yaw };
        el.classList.add('is-drag');
      }
      P.hist.push([now(), e.clientX]); if (P.hist.length > 6) P.hist.shift();
      if (S.concept === 'chain') {
        const g = S.rig[S.act], prevYaw = g.yaw;
        g.yaw = S.drag.yaw0 + (e.clientX - S.drag.x0) * 0.012;
        g.yv = (g.yaw - prevYaw) * 60; g.szv = clamp(g.szv - (e.clientX - (P.lx || e.clientX)) * 0.00025, -0.25, 0.25);
        P.lx = e.clientX;
      } else {
        const pxItem = (SP() / (2 * S.cam.halfW)) * S.w;
        const r = S.drag.r0 - (e.clientX - S.drag.x0) / pxItem;
        S.r = r < 0 ? r * 0.35 : r > N - 1 ? N - 1 + (r - N + 1) * 0.35 : r;   // резинка на краях
      }
      poke();
    });
    function up(e) {
      const P = S.ptr; if (!P || P.id !== e.pointerId) return;
      S.ptr = null; el.classList.remove('is-drag');
      const h = P.hist, a = h[0], b = h[h.length - 1], vx = b[0] > a[0] ? ((b[1] - a[1]) / (b[0] - a[0])) * 1000 : 0;   // px/с
      if (S.drag) {
        if (S.concept === 'chain') { S.rig[S.act].yv = clamp(vx * 0.012, -14, 14); }
        else {
          const pxItem = (SP() / (2 * S.cam.halfW)) * S.w, v = -vx / pxItem, to = clamp(Math.round(S.r + v * 0.22), 0, N - 1);
          S.rv = v; S.rt = to;
          if (opts.drive === 'scroll') go(to);   // в ленте свайп листает тем же путём, что и прокрутка: страница доезжает до вещи
        }
        S.drag = null; poke();
        return;
      }
      if (e.type === 'pointerup' && S.concept === 'rail') pick(e);   // тап по вещи — в фокус
    }
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    function pick(e) {
      const rc = stage.getBoundingClientRect(), u = (e.clientX - rc.left) / rc.width, v = (e.clientY - rc.top) / rc.height;
      let best = -1, bd = 0.09;
      for (let i = 0; i < N; i++) {
        const x = railX(i, S.r), it = items[i], yc = -0.17 - (it.h - it.top) / 2, pp = project(x, yc, railZ(x));
        const pv = project(x, bottomOf(i), railZ(x))[1], pt = project(x, 0.05, railZ(x))[1];
        if (v < pt - 0.02 || v > pv + 0.02) continue;
        const d = Math.abs(pp[0] - u);
        if (d < bd) { bd = d; best = i; }
      }
      if (best >= 0 && best !== S.focus) go(best);
    }
    stage.addEventListener('wheel', (e) => {   // только горизонтальное колесо/тачпад — вертикаль не перехватываем
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || opts.drive === 'scroll') return;
      e.preventDefault();
      if (S.concept === 'chain') { S.rig[S.act].yv = clamp(S.rig[S.act].yv - e.deltaX * 0.02, -12, 12); poke(); return; }
      S.wx = (S.wx || 0) + e.deltaX;
      const pxItem = (SP() / (2 * S.cam.halfW)) * S.w;
      S.rt = clamp(S.rt + e.deltaX / pxItem, -0.3, N - 0.7);
      clearTimeout(S.wT); S.wT = setTimeout(() => { S.rt = clamp(Math.round(S.rt), 0, N - 1); poke(); }, 140);
      poke();
    }, { passive: false });

    /* ── прокрутка страницы ведёт рейл (drive: 'scroll' — блок «Дроп на вешалках» в ленте сайта) ── */
    function onScroll() {
      if (opts.drive !== 'scroll') return;
      const rc = el.getBoundingClientRect(), pin = $('.rk-pin'), off = parseFloat(getComputedStyle(pin).top) || 0, total = el.offsetHeight - pin.offsetHeight;
      const pr = clamp((off - rc.top) / Math.max(1, total), 0, 1), pos = pr * (N - 1), i = Math.floor(pos), f = pos - i;
      if (S.concept === 'chain') { const n = clamp(Math.round(pos), 0, N - 1); if (n !== S.focus) rigSwitch(n); }
      else S.rt = Math.min(N - 1, i + sm(sm(f)));   // «магнит»: вещь задерживается в фокусе
      poke();
    }
    if (opts.drive === 'scroll') W.addEventListener('scroll', onScroll, { passive: true });

    /* ── размеры и видимость ── */
    // фото ряда-фолбэка: только когда WebGL нет, вещь в фокусе ±1, и по одной за кадр простоя — без пачки декодов
    // Декод заранее (img.decode() — вне главного потока) и по одной картинке в простое, начиная с вещи в фокусе:
    // к моменту, когда блок въезжает в экран, картинки готовы и растр не упирается в декод пачкой.
    // ряд-фолбэк: вещь в фокусе — по центру (по реальной раскладке, ширины вещей заданы CSS)
    function fbFocus(i) {
      const its = fbRow.querySelectorAll('.rk-fb-it');
      let on = null; its.forEach((f) => { const k = +f.dataset.i === i; f.classList.toggle('is-on', k); if (k) on = f; });
      if (on) { const box = fbRow.parentNode.clientWidth; fbRow.style.setProperty('--rk-fb-x', (box / 2 - (on.offsetLeft + on.offsetWidth / 2)).toFixed(1) + 'px'); }
      fbLoad();
    }
    function fbLoad() {
      if (el.dataset.gl !== 'off' || S.fbBusy) return;
      const next = [...fbRow.querySelectorAll('img:not([src])')].sort((a, b) => Math.abs(a.dataset.i - S.focus) - Math.abs(b.dataset.i - S.focus))[0];
      if (!next) return;
      S.fbBusy = true;
      const idle = W.requestIdleCallback || ((f) => setTimeout(f, 120));
      idle(() => {
        const pre = new Image(); pre.decoding = 'async'; pre.src = next.dataset.src;
        const done = () => { next.src = next.dataset.src; S.fbBusy = false; setTimeout(fbLoad, 60); };
        (pre.decode ? pre.decode() : Promise.resolve()).then(done, done);
      }, { timeout: 1500 });
    }
    function measure() {
      const rc = stage.getBoundingClientRect();
      // пятно света: 64 px, растянутое композитором (см. rack.css)
      stage.style.setProperty('--rk-sx', ((rc.width * 0.84) / 64).toFixed(2));
      stage.style.setProperty('--rk-sy', ((rc.height * 0.92) / 64).toFixed(2));
      if (el.dataset.gl === 'off') fbFocus(S.focus);
      S.w = Math.max(2, rc.width); S.h = Math.max(2, rc.height); S.dpr = Math.min(W.devicePixelRatio || 1, 2);
      camFit(); wake(); pump();
    }
    const ro = W.ResizeObserver ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(stage); else W.addEventListener('resize', measure);
    const io = W.IntersectionObserver ? new IntersectionObserver((es) => {
      const e = es[es.length - 1];
      if (e.isIntersecting && !S.visible) S.visAt = now();
      S.visible = e.isIntersecting;
      if (S.visible) { start(); wake(); }
    }, { rootMargin: '200px 0px' }) : null;
    if (io) io.observe(stage); else { S.visible = true; }
    // «на экране» — сцена реально в кадре хотя бы на треть (для авто-вращения: до входа вещь стоит лицом)
    const io2 = W.IntersectionObserver ? new IntersectionObserver((es) => { const e = es[es.length - 1]; if (e.isIntersecting && !S.onScreen) S.onScreenAt = now(); S.onScreen = e.isIntersecting; wake(); }, { threshold: 0.35 }) : null;
    if (io2) io2.observe(stage); else S.onScreen = true;
    if (GV.gl && typeof GV.gl.onOff === 'function') GV.gl.onOff(() => { if (HUB.kind === 'shared' || HUB.st === 'idle') { el.dataset.gl = 'off'; S.why = 'gl: ' + (GV.gl.why || 'off'); fbFocus(S.focus); } });
    else if (Q.has('nogl')) { el.dataset.gl = 'off'; requestAnimationFrame(() => fbFocus(S.focus)); }
    D.addEventListener('visibilitychange', () => { if (!D.hidden) wake(); });
    // карточка/корзина/меню поверх страницы — блок на странице замирает (вкладка «3D» в карточке при этом живёт)
    function onOverlay(e) { if (BARE) return; S.paused = !!(e.detail && e.detail.open); if (!S.paused) wake(); }
    D.addEventListener('grinchin:overlay', onOverlay);
    RMQ.addEventListener && RMQ.addEventListener('change', () => { el.dataset.rm = RM() ? '1' : '0'; wake(); });
    el.dataset.rm = RM() ? '1' : '0';

    /* ── движок и ленивая загрузка ── */
    function onHub(st) {
      if (st === 'ok') { S.ready = true; el.dataset.gl = 'on'; camFit(); pose(); wake(); hubPump(); }
      else if (st === 'off') { S.ready = false; el.dataset.gl = 'off'; S.why = HUB.why; fbFocus(S.focus); }
    }
    function start() {
      if (S.started) return; S.started = true;
      HUB.insts.add(api);
      hubStart({ items, logo: LOGO, soft: opts.soft });
      if (HUB.st === 'ok' || HUB.st === 'off') onHub(HUB.st);
    }
    // приоритет: сначала то, что в кадре (фото-заглушка мгновенно, затем GLB), потом соседи; дальние — не грузим вовсе
    function tasks() {
      const f = S.focus, narrow = NARROW.matches, chain = S.concept === 'chain';
      const dist = (i) => (chain ? Math.abs(i - f) : Math.abs(wrapD(i, f)));
      const order = items.map((it) => it.i).sort((a, b) => dist(a) - dist(b) || b - a);
      const reachStub = chain ? 1 : narrow ? 2 : 3, reachGlb = chain ? (opts.ui === 'bare' ? 0 : 1) : narrow ? 1 : 2;
      const out = [], T = (i, kind) => {
        const it = items[i], md = opts.models[it.id];
        out.push({ id: it.id, kind, src: kind === 'glb' ? md && md.url : opts.stubs[it.id], meta: Object.assign({ h: it.h, top: it.top }, kind === 'glb' ? md : null) });
      };
      for (const i of order) { const d = dist(i); if (d <= reachStub) T(i, 'stub'); if (d === 0) T(i, 'glb'); }
      for (const i of order) { const d = dist(i); if (d > 0 && d <= reachGlb) T(i, 'glb'); }
      // полное качество (2048, ~290 тыс. треуг.) — только вещи в фокусе и только когда она остановилась
      if (S.fullWant === f && md(f) && md(f).full) out.push({ id: items[f].id, kind: 'full', src: md(f).full, meta: Object.assign({ h: items[f].h, top: items[f].top }, md(f), { url2: md(f).full2 }) });
      return out;
    }
    const md = (i) => opts.models[items[i].id];
    // какие полные модели держать: фокус; на десктопе — ещё соседей, если уже загружены (память телефона бережём)
    function fullKeep() {
      if (S.dead) return [];
      const f = S.focus, keep = [items[f].id];
      if (!NARROW.matches && !BARE && S.concept === 'rail') keep.push(items[(f + N - 1) % N].id, items[(f + 1) % N].id);
      return keep;
    }
    function settle() {   // фокус остановился → догружаем полное качество, лишнее выгружаем
      clearTimeout(S.fullT);
      S.fullT = setTimeout(() => { S.fullT = 0; S.fullWant = S.focus; hubFullGC(); pump(); }, BARE ? 60 : 450);
    }
    function pump() { S.active = now(); hubPump(); }
    function onLoaded(id, kind, r) {
      const it = items.find((x) => x.id === id);
      if (it && r && r.drop != null) { it.drop = r.drop; if ((kind === 'glb' || kind === 'full') && r.size) it.bot = r.size[1] - r.top; }
      if (kind === 'glb' || kind === 'full') el.dispatchEvent(new CustomEvent('grinchin:rack-model', { bubbles: true, detail: Object.assign({ id }, r) }));
      if (S.ready) { camFit(); pose(); } wake();
    }
    const api = { _hub: onHub, _tasks: tasks, _loaded: onLoaded, _keep: fullKeep, _live: () => S.visible && !S.dead && !S.paused, _active: () => S.active || 0 };

    function debug() {
      hubStats().then((v) => {
        if (!v) return;
        dbg.textContent = `fps ${S.fps.v.toFixed(0)} · dpr ${(S.dpr * S.dprK).toFixed(2)} · ${HUB.kind}\n` +
          `tris ${(v.tris / 1000).toFixed(0)}k · calls ${v.calls} · prog ${v.programs}\n` + v.loaded.map((s, i) => pad(i + 1) + ':' + s).join(' ') + '\n' + (v.gpu || '');
      });
    }

    renderInfo(startIdx, true);
    camFit();
    if (opts.drive === 'scroll') requestAnimationFrame(onScroll);

    const inst = {
      el, go, next, prev,
      focus: () => S.focus,
      concept: (c) => { if (c) setConcept(c); return S.concept; },
      state: () => ({ concept: S.concept, focus: S.focus, r: S.r, gl: el.dataset.gl, why: S.why || HUB.why, engine: HUB.kind, dpr: S.dpr * S.dprK, load: HUB.load, fps: S.fps.v }),
      stats: hubStats,
      // замер: столько-то мс непрерывного движения, кадры считает воркер (реально нарисованные)
      bench: async (ms) => {
        ms = ms || 3000;
        const a = await inst.stats(), t0 = now(), keepAuto = opts.auto;
        opts.auto = true;
        const kick = setInterval(() => { if (S.concept === 'chain') S.rig[S.act].yv = 3; else S.sw.forEach((q) => (q.v += 0.02)); poke(); }, 400);
        poke();
        await new Promise((r) => setTimeout(r, ms));
        clearInterval(kick); opts.auto = keepAuto;
        const b = await inst.stats();
        return a && b ? +(((b.frames - a.frames) * 1000) / (now() - t0)).toFixed(1) : null;
      },
      // движок общий и остаётся жить (его держит сайт / другие экземпляры); экземпляр только отписывается
      destroy: () => {
        S.dead = true; LOOP.fns.delete(frame); HUB.insts.delete(api); clearTimeout(S.fullT); hubFullGC();
        if (ro) ro.disconnect(); if (io) io.disconnect(); if (io2) io2.disconnect(); W.removeEventListener('scroll', onScroll); D.removeEventListener('grinchin:overlay', onOverlay);
        el.innerHTML = ''; el.classList.remove('rk'); if (GV.rack.inst === inst) GV.rack.inst = null;
      },
    };
    if (!BARE) GV.rack.inst = inst;
    return inst;
  }

  /* ассеты сайта (build.py раскрывает маркеры asset); в прототипе маркеры не раскрыты — пути приходят через opts */
  const A = (s) => (/^\{\{/.test(s) ? null : s);
  const ASSETS = { models: {}, stubs: {} };
  (() => {
    const M = {
      // [лёгкая, лёгкая-2, полная, полная-2]: лёгкие — tools/lod.sh (~73 тыс. треуг., 1024), полные — модели G1 как есть (2048)
      'jeans-restart': ['{{asset:img/v4/3d/jeans-restart.glb}}', null, '{{asset:img/v4/3d/full/jeans-restart.glb}}'],
      'suit-detour': ['{{asset:img/v4/3d/suit-detour-top.glb}}', '{{asset:img/v4/3d/suit-detour-pants.glb}}', '{{asset:img/v4/3d/full/suit-detour-top.glb}}', '{{asset:img/v4/3d/full/suit-detour-pants.glb}}'],
      'jeans-scribble': ['{{asset:img/v4/3d/jeans-scribble.glb}}', null, '{{asset:img/v4/3d/full/jeans-scribble.glb}}'],
      'hoodie-crack': ['{{asset:img/v4/3d/hoodie-crack.glb}}', null, '{{asset:img/v4/3d/full/hoodie-crack.glb}}'],
      'jacket-biker': ['{{asset:img/v4/3d/jacket-biker.glb}}', null, '{{asset:img/v4/3d/full/jacket-biker.glb}}'],
      'jeans-redline': ['{{asset:img/v4/3d/jeans-redline.glb}}', null, '{{asset:img/v4/3d/full/jeans-redline.glb}}'],
      'tee-blank': ['{{asset:img/v4/3d/tee-blank.glb}}', null, '{{asset:img/v4/3d/full/tee-blank.glb}}'],
      'longsleeve-blank': ['{{asset:img/v4/3d/longsleeve-blank.glb}}', null, '{{asset:img/v4/3d/full/longsleeve-blank.glb}}'],
    };
    const S = {
      'jeans-restart': ['{{asset:img/v4/3d/stubs/jeans-restart.webp}}'],
      'suit-detour': ['{{asset:img/v4/3d/stubs/suit-detour.webp}}', '{{asset:img/v4/3d/stubs/suit-detour-b.webp}}'],
      'jeans-scribble': ['{{asset:img/v4/3d/stubs/jeans-scribble.webp}}', '{{asset:img/v4/3d/stubs/jeans-scribble-b.webp}}'],
      'hoodie-crack': ['{{asset:img/v4/3d/stubs/hoodie-crack.webp}}', '{{asset:img/v4/3d/stubs/hoodie-crack-b.webp}}'],
      'jacket-biker': ['{{asset:img/v4/3d/stubs/jacket-biker.webp}}'],
      'jeans-redline': ['{{asset:img/v4/3d/stubs/jeans-redline.webp}}'],
      'tee-blank': ['{{asset:img/v4/3d/stubs/tee-blank.webp}}'],
      'longsleeve-blank': ['{{asset:img/v4/3d/stubs/longsleeve-blank.webp}}'],
    };
    const abs = (u) => { try { return new URL(u, location.href).href; } catch (e) { return u; } };   // воркер живёт на blob: — нужны абсолютные адреса
    const U = (x) => (x && A(x) ? abs(A(x)) : undefined);
    for (const id in M) { const u = U(M[id][0]); if (u) ASSETS.models[id] = { url: u, url2: U(M[id][1]), full: U(M[id][2]), full2: U(M[id][3]) }; }
    for (const id in S) { const u = A(S[id][0]); if (u) ASSETS.stubs[id] = [abs(u), S[id][1] && A(S[id][1]) ? abs(A(S[id][1])) : null]; }
  })();

  // вкладка «3D» в карточке товара (V2): вещь на цепи с карабином, крутится пальцем; destroy() — при закрытии карточки
  function mountProduct(el, id, o) {
    return mount(el, Object.assign({ concept: 'chain', drive: 'drag', ui: 'bare', start: id, title: '3D' }, o || {}));
  }
  // блок «Дроп на вешалках» в ленте сайта: <section id="rack" data-rack-mount>. Ось режимов data-rack: off | drag | scroll(on)
  function auto() {
    const el = D.querySelector('[data-rack-mount]'); if (!el || el.classList.contains('rk')) return;
    const ax = D.documentElement.dataset.rack || 'on';
    if (ax === 'off') { el.hidden = true; return; }
    el.hidden = false;
    mount(el, { concept: ax === 'chain' ? 'chain' : 'rail', drive: ax === 'drag' || ax === 'chain' ? 'drag' : 'scroll', start: el.dataset.start || 'jeans-restart', auto: !Q.has('still') });
  }
  GV.rack = { v: 2, mount, mountProduct, KIND, inst: null, engine: () => ({ kind: HUB.kind, state: HUB.st, why: HUB.why, gpu: HUB.gpu }) };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', auto); else auto();
})();
