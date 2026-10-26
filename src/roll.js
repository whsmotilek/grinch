/* GRINCHIN v4 · «Рулон-маршрут», мультяшный (V3; маршрут и физика — T1 v3.1) → window.GV.roll
   v4: лента — мультяшные тайлы (img/v4/tape/tile-lime|black: толстый контур, плоская заливка, блик), рваные концы —
   спрайты end-* с контуром, загибы — с чёткой складкой, финал — крест tape-cross; на загибах — стикеры (ось stickers).
   Рулон — CSS-спрайт: тело (вид сверху, печать едет по прокрутке) + торец tape-roll-front, сжатый в эллипс (перспектива)
   и вращающийся на угол качения; к финалу/смене рулон ложится на торец — эллипс раскрывается в круг. WebGL-рулона больше нет:
   плоская мультяшная графика спрайтом сочнее и легче (ни сцены в GV.gl, ни перерисовки холста — только transform).

   Рулон фирменной ленты появляется сразу после hero и катится через всю страницу до подвала в такт прокрутке,
   раскатывая за собой ленту; вверх — сматывается обратно. Оси: data-roll = page | quiet | off, data-tape = lime | black.

   Маршрут не нарисован руками — он СЧИТАЕТСЯ по странице (и пересчитывается при любом изменении высоты блоков,
   ResizeObserver): препятствия = текст (прямоугольники строк), ссылки/кнопки/поля, карточки товаров, 3D-объекты,
   маскоты, лаймовые плашки. Содержимое липких (sticky) кадров «размазывается» на весь их ход. Фото и пустые фоны —
   можно. Лента идёт полосой в правом поле страницы (центр поля каталога); если полоса перекрыта — лента уходит ПОД блок
   (туннель: срез по стыку секций с тенью) и выходит у его нижнего края. Начало — поперёк верхнего поля каталога слева
   направо, загиб на 45°, вниз. Конец — в подвале: поворот влево по свободной полосе (если есть), крест лайм/чёрная
   поверх конца ленты, рулон ложится на торец.

   «Один зелёный объект на экран»: в режиме tape=lime лаймовая лента только в блоках без своего зелёного (каталог);
   на входе в «зелёный» блок лаймовый рулон кончается (худеет до шпули), шпуля ложится и исчезает, падает чёрный рулон —
   дальше чёрная лента с лаймовой печатью. Если смена приходится на туннель — подмена скрыта под блоком.

   Катится честно: угол = ∫ds/R (у худеющего рулона — замкнутая формула), R² = rc² + (R0² − rc²)·(1 − s/L).
   Рендер: лента — DOM-полосы с мультяшным тайлом (img/v4/tape/tile-*.webp); раскрытие — два встречных transform
   (окно едет, лента внутри стоит) → без перерисовки. Рулон — CSS-спрайт в слое страницы (едет с ней, без «плавания»);
   цикл — общий GV.gl.loop (рендер по требованию), без него — свой rAF. reduced-motion и ?shot=1 — маршрут целиком, рулон лежит в конце, ничего
   не движется. Отладка: ?rolldbg — показать препятствия. */
(() => {
  'use strict';
  const GV = (window.GV = window.GV || {});
  if (GV.roll) return;
  const D = document, R = D.documentElement, W = window;
  const MODE = R.dataset.roll || 'page';
  if (MODE === 'off') { D.addEventListener('DOMContentLoaded', () => { const s = D.getElementById('roll-stage'); if (s) s.remove(); }); GV.roll = { v: 31, off: true }; return; }
  const QUIET = MODE === 'quiet';
  // телефон: торец рулона смотрит НАРУЖУ (к краю экрана) — внутрь рулон выступает только на полширины ленты, и полоса
  // в поле 24 px проходит мимо карточек, а не уходит под каталог туннелем (v4.1: «на мобильной ленты не видно»)
  const faceOut = (Wd) => Wd < 768;
  const TAPE = R.dataset.tape === 'black' ? 'black' : 'lime';
  const Q = new URLSearchParams(location.search);
  const SHOT = R.dataset.shot === '1' || Q.get('shot') === '1';
  const RMQ = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const DBG = Q.has('rolldbg');
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const sstep = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const damp = (x, t, l, dt) => x + (t - x) * (1 - Math.exp(-l * dt));
  const now = () => performance.now();
  const idle = (f, to) => (W.requestIdleCallback ? W.requestIdleCallback(f, { timeout: to || 1200 }) : setTimeout(f, 60));
  const TILE_AR = { lime: 408 / 128, black: 488 / 128 };   // мультяшные тайлы v4 (высота 128 = ширина ленты)
  const END_AR = { lime: 150 / 128, black: 159 / 128 }, END_BODY = 0.825, END_TOP = 0.155;   // спрайты end-*: тело ленты 82 % высоты, сверху 15,5 %   // рваный конец end-*: тело ленты — 82 % высоты спрайта, с 16 %
  const FACE_K = 0.3;   // торец в перспективе: эллипс 2R вдоль курса × 2R·k поперёк
  const CROSS_W = (w, Wd) => Math.round(w * (Wd < 768 ? 7 : 5.5));   // финальный крест tape-cross (квадрат)
  // стикеры на загибах: ось data-stickers (V1) = on (2 шт.) | max (4) | off; без оси — по режиму (2 — щедро, 3 — нет)
  const STK = (() => { const v = R.dataset.stickers || ({ 2: 'max', 3: 'off' })[R.dataset.m] || 'on'; return v === 'off' ? 0 : v === 'max' ? 4 : 2; })();

  /* ═════════════ 1. ПРЕПЯТСТВИЯ (координаты документа) ═════════════ */
  // блоки, под которые можно «нырнуть» (туннель), — от мелкого к крупному
  const UNITS = ['.ab-door', '#brand-stage', '#looks', '#drop', '#about', '#next', '#footer', '.hx-marquee'];
  // 3D-сцена рейла (S1) ловит перетаскивание, но это «картинка», не кнопка: ленте поверх неё можно (pointer-events:none)
  const SOFT = '.rk-stage';
  const HARD = 'a[href],button,input,select,textarea,label,summary,[role=button],[tabindex]:not([tabindex="-1"]),article.card,[data-product],.nx-bag,#looks .lk-print';   // полароиды «Образов» — не под ленту (в т.ч. reduced-motion)
  // зелёные объекты: 3D-G, маскоты, лаймовые плашки/ленты, 3D-знак, лого подвала, дверь со скотчем, граффити истории
  const GREEN = '#g3d,[data-mascot-slot],.btn--accent,.tape--lime,.tape--toon-lime,.tape-strip--lime,.k2-sign__view,.bs-svg,.fo-logo,.ab-door';
  const VIEW3D = '.k2-sign__view';   // 3D-знак: в кадре рисуется по центру — поля холста пустые
  // фото и холсты в липких кадрах (дверь T2 на телефоне, улица истории): ленте по ним нельзя — кадр стоит, страница едет
  const PINNED = 'img,video,canvas,.bs-street';
  const SKIP = '.ov,#site-menu,template,script,style,noscript,#loader,.mtag,.mpanel,#roll-stage,.vh,.toast,#header,#hero,.skip';

  function shown(el) {
    if (!el.getClientRects().length) return false;
    if (el.checkVisibility) return el.checkVisibility({ visibilityProperty: true });
    return getComputedStyle(el).visibility !== 'hidden';
  }
  const stickyMemo = new Map();
  function stickyOf(el) {   // ближайший sticky-предок (кадр, который стоит, пока блок едет)
    const path = [];
    let e = el, res = null;
    while (e && e !== D.body) {
      if (stickyMemo.has(e)) { res = stickyMemo.get(e); break; }
      path.push(e);
      if (getComputedStyle(e).position === 'sticky') { res = e; break; }
      e = e.parentElement;
    }
    for (const p of path) stickyMemo.set(p, res);
    return res;
  }
  function smear(el, r, sy) {   // y-диапазон препятствия на весь ход sticky-кадра
    let y0 = r.top + sy, y1 = r.bottom + sy;
    const S = stickyOf(el);
    if (S) {
      const sb = S.getBoundingClientRect(), pb = S.parentElement.getBoundingClientRect(), pcs = getComputedStyle(S.parentElement);
      const sNow = sb.top + sy, sMin = pb.top + sy + parseFloat(pcs.paddingTop || 0), sMax = pb.bottom + sy - parseFloat(pcs.paddingBottom || 0) - sb.height;
      y0 -= Math.max(0, sNow - sMin); y1 += Math.max(0, sMax - sNow);
    }
    return [y0, y1];
  }
  function collect(Wd) {
    stickyMemo.clear();
    const sy = W.scrollY || 0, obs = [], greens = [], frames = new Map();
    const add = (arr, el, r, k, inset) => {
      if (r.width < 1 || r.height < 1 || (arr !== greens && (r.right < 0 || r.left > Wd))) return;
      const [y0, y1] = smear(el, r, sy), ix = inset ? r.width * inset : 0;
      arr.push({ x0: r.left + ix, x1: r.right - ix, y0, y1, k, el, r: { l: r.left + ix, r: r.right - ix, t: r.top, b: r.bottom } });
    };
    const roots = [D.getElementById('main'), D.getElementById('footer')].filter(Boolean);
    for (const root of roots) {
      const tw = D.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let t, lastP = null, lastOk = false;
      const rg = D.createRange();
      while ((t = tw.nextNode())) {
        if (!/\S/.test(t.data)) continue;
        const p = t.parentElement;
        if (p !== lastP) { lastP = p; lastOk = !!p && !p.closest(SKIP) && shown(p); }
        if (!lastOk) continue;
        rg.selectNodeContents(t);
        for (const r of rg.getClientRects()) add(obs, p, r, 'T');
      }
      for (const el of root.querySelectorAll(HARD)) if (!el.closest(SKIP) && !el.matches(SOFT) && shown(el)) add(obs, el, el.getBoundingClientRect(), el.matches('article.card') ? 'C' : 'I');
      for (const el of root.querySelectorAll(PINNED)) {
        // видимость самой картинки не важна (дверь T2 рисует её холстом) — важен показанный липкий кадр
        if (el.closest(SKIP) || el.closest(VIEW3D) || !el.getClientRects().length) continue;
        const fr = stickyOf(el); if (!fr || !shown(fr) || frames.has(fr)) continue;
        frames.set(fr, el);
      }
      // карусель, которая листается вбок: подписи могут оказаться где угодно по ширине → вся её полоса занята
      for (const el of root.querySelectorAll('.lk-rail')) {
        if (!shown(el) || !/auto|scroll/.test(getComputedStyle(el).overflowX) || el.scrollWidth <= el.clientWidth + 4) continue;
        const b = el.getBoundingClientRect();
        add(obs, el, { left: 0, right: Wd, top: b.top, bottom: b.bottom, width: Wd, height: b.height }, 'M');
      }
      for (const el of root.querySelectorAll(GREEN)) {
        if (el.closest(SKIP) || !shown(el)) continue;
        const r = el.getBoundingClientRect();
        if (el.matches('.bs-svg')) {   // история (знак, стрелки, лого): каждая фигура отдельно — и уже видимые, и будущие
          let u = null;
          for (const c of el.querySelectorAll('path,rect,circle,ellipse,line,polyline,polygon,text,use')) {
            const b = c.getBoundingClientRect(); if (b.width < 1 && b.height < 1) continue;
            const r = { left: Math.max(0, b.left), right: Math.min(Wd, b.right), top: b.top, bottom: b.bottom };
            if (r.right <= r.left) continue;
            r.width = r.right - r.left; r.height = r.bottom - r.top;
            add(obs, c, r, 'G');
            u = u ? { left: Math.min(u.left, r.left), top: Math.min(u.top, r.top), right: Math.max(u.right, r.right), bottom: Math.max(u.bottom, r.bottom) } : Object.assign({}, r);
          }
          if (u) { u.width = u.right - u.left; u.height = u.bottom - u.top; add(greens, el, u, 'G'); }
          continue;
        }
        add(greens, el, r, 'G');
        if (el.matches('.ab-door,.tape--lime,.tape--toon-lime')) continue;           // дверь (фото) и куски ленты K3 — не препятствие (можно рядом)
        add(obs, el, r, 'G', el.matches(VIEW3D) ? 0.12 : 0);
      }
    }
    // дверь (T2, GV.door.zones): зелёное слово и заголовок — препятствия; в режиме камеры кадр липкий → туннель (см. PINNED)
    if (GV.door && GV.door.zones) {
      try {
        const z = GV.door.zones(), el = D.querySelector('.ab-door') || D.body;
        if (z && z.mode === 'static') for (const k of ['word']) {   // заголовок — строками текста из DOM (zones.title — вся подпись-контейнер)
          const q = z[k]; if (!q) continue;
          obs.push({ x0: q[0], x1: q[2], y0: q[1] + sy, y1: q[3] + sy, k: k === 'word' ? 'G' : 'T', el });
        }
      } catch (e) { /* дверь не готова — хватит DOM-замеров */ }
    }
    const units = [];
    for (const sel of UNITS) {
      const el = D.querySelector(sel); if (!el || !shown(el)) continue;
      const b = el.getBoundingClientRect();
      units.push({ sel, el, y0: b.top + sy, y1: b.bottom + sy });
    }
    // липкие кадры с фото (дверь T2 на телефоне, улица истории): ленту внутри кадра кладём в «зеркало» — свой липкий
    // слой той же высоты и с тем же top: кадр стоит — и лента на нём стоит, стыки с лентой страницы прячутся под шапкой
    // и под нижним краем экрана (кадр во весь экран). Препятствия внутри кадра — в его собственных координатах.
    const pins = [];
    for (const [fr] of frames) {
      const blk = fr.parentElement, fb = fr.getBoundingClientRect(), bb = blk.getBoundingClientRect();
      const top = parseFloat(getComputedStyle(fr).top) || 0;
      if (fb.height < innerHeight * 0.45 || bb.height < fb.height + 40) continue;
      const loc = [], rest = [];
      for (const o of obs) (fr.contains(o.el) ? loc : rest).push(o);
      obs.length = 0; obs.push(...rest);
      const fTopNow = fb.top + sy;
      // дверь T2 в режиме камеры: зелёное слово ездит по кадру — берём его рамку на всём ходе камеры (GV.door.pose)
      const wordLoc = [];
      if (fr.closest('.ab-door') && GV.door && GV.door.pose) {
        try {
          for (let yy = -fb.height; yy <= bb.height + fb.height; yy += 24) {
            const q = GV.door.pose(yy); if (!q) break;
            const dw = GV.door.word || { x0: 302, x1: 2304, y0: 466, y1: 963 };   // рамка слова в кадре двери (door.js)
            const x0 = q.tx + dw.x0 * q.k, x1 = q.tx + dw.x1 * q.k, y0 = q.ty + dw.y0 * q.k, y1 = q.ty + dw.y1 * q.k;
            if (x1 > 0 && x0 < fb.width) wordLoc.push({ x0: Math.max(0, x0), x1: Math.min(fb.width, x1), y0, y1, k: 'G', el: fr });
          }
        } catch (e) { /* без камеры — DOM-замеров хватит */ }
      }
      pins.push({ el: fr, blk, top, fh: fb.height, fw: fb.width, left: fb.left, bTop: bb.top + sy, bBot: bb.bottom + sy,
        loc: loc.filter((o) => o.r).map((o) => ({ x0: o.r.l - fb.left, x1: o.r.r - fb.left, y0: o.r.t - fb.top, y1: o.r.b - fb.top, k: o.k, el: o.el })).filter((o) => o.y1 > 0 && o.y0 < fb.height).concat(wordLoc) });
      void fTopNow;
    }
    if (frames.size) units.push(...pins.map((p) => ({ sel: 'pin', el: p.blk, y0: p.bTop, y1: p.bBot })));
    units.push(...[...D.querySelectorAll('.lk-rail')].filter(shown).map((el) => { const b = el.getBoundingClientRect(); return { sel: '.lk-rail', el, y0: b.top + sy, y1: b.bottom + sy }; }));
    return { obs, greens, units, pins };
  }

  /* ═════════════ 2. МАРШРУТ ═════════════ */
  function sizes(Wd) {
    let w = Wd >= 1100 ? 30 : Wd >= 768 ? 24 : 12;
    if (QUIET) w = Math.max(8, Math.round(w * 0.72));
    const R0 = Math.round(w * (Wd < 768 ? 2 : 1.35)), rc = Math.round(w * (Wd < 768 ? 0.92 : 0.8));   // на телефоне рулон заметнее: Ø 48 при ленте 12
    return { w, R0, rc, c: Wd >= 768 ? 8 : 2, pad: Math.max(3, Math.round(w * 0.3)) };
  }
  // Маршрут — сверху вниз: вертикальные пробеги по свободным полосам + поперечные пробеги с загибами 45°.
  // Ритм: поперечный пробег примерно раз в 1–1,7 экрана (не чаще одного на экран), лучше — на стыке блоков, и с переходом
  // на другую сторону страницы (зигзаг). Полоса перекрыта и перейти нельзя — туннель под самым коротким блоком.
  // Перед липким кадром с фото лента выходит на полосу кадра и дальше едет «в кадре» (pin).
  function plan(E) {
    const { Wd, vh, H, obs, units, pins, drop, xL, w, R0, c, sl, foot, xMin } = E;
    const band = w / 2 + Math.max(c, sl + 2), cr = R0 + c, xMax = xL;
    const bandH = w / 2 + Math.max(c, Math.ceil(R0 * FACE_K) + 3);   // поперечный пробег: торец смотрит вниз — запас под эллипс
    const RH0 = 1.0, RH1 = 1.75;                                  // ритм поперечных пробегов, в экранах
    const step = Wd < 768 ? 8 : 12;
    const hit = (x0, y0, x1, y1) => { for (const o of obs) if (o.x0 < x1 && o.x1 > x0 && o.y0 < y1 && o.y1 > y0) return o; return null; };
    const firstBlock = (x, ya, yb) => { let m = null; for (const o of obs) if (o.x0 < x + band && o.x1 > x - band && o.y1 > ya && o.y0 < yb && (!m || o.y0 < m.y0)) m = o; return m; };
    const ccr = cr * 1.3;   // на развороте рулон по диагонали шире своей полосы (замер v4.1: вылет 11 px у маскота подписки)
    const corner = (x, y) => x >= xMin - 0.5 && x <= xMax + 0.5 && !hit(x - ccr, y - ccr, x + ccr, y + ccr);
    const seams = []; for (const u of units) seams.push(u.y0, u.y1);
    const seamB = (y) => { let d = 1e9; for (const q of seams) d = Math.min(d, Math.abs(q - y)); return d < 160 ? 240 * (1 - d / 160) : 0; };
    const lanes = (ya, yb) => {   // центры полос, свободные на [ya, yb]: концы и середины свободных промежутков
      const iv = [];
      for (const o of obs) if (o.y1 > ya && o.y0 < yb) iv.push([o.x0 - band, o.x1 + band]);
      iv.sort((p, q) => p[0] - q[0]);
      const out = []; let cur = xMin;
      const push = (l, r) => { if (r - l < 0) return; out.push(Math.round(l), Math.round(r)); if (r - l > 160) out.push(Math.round((l + r) / 2)); };
      for (const [l, r] of iv) { if (l > cur) push(cur, Math.min(l, xMax)); cur = Math.max(cur, r); if (cur >= xMax) break; }
      if (cur < xMax) push(cur, xMax);
      return out.filter((x) => x >= xMin - 0.5 && x <= xMax + 0.5);
    };
    const pinAfter = (y) => pins.find((p) => p.bTop >= y - 1 && p.ok);
    const S = [];
    const seg = (ax, ay, bx, by, t, ex) => { if (Math.hypot(bx - ax, by - ay) < 1.5) return null; const g = Object.assign({ a: { x: ax, y: ay }, b: { x: bx, y: by }, t }, ex || {}); S.push(g); return g; };
    // полоса внутри липкого кадра: свободна ли правая полоса в его координатах
    for (const p of pins) {
      const lx = xL - p.left;
      p.x = xL;
      // полоса в кадре: занятые участки по y (знак истории, стрелки) — лента проходит ПОД ними (туннель в кадре)
      const bl = p.loc.filter((o) => o.x0 < lx + band && o.x1 > lx - band).map((o) => [Math.max(0, o.y0 - cr), Math.min(p.fh, o.y1 + cr)]).sort((a, b) => a[0] - b[0]);
      const under = [];
      for (const q of bl) { const l = under[under.length - 1]; if (l && q[0] <= l[1] + cr * 2) l[1] = Math.max(l[1], q[1]); else under.push(q.slice()); }   // короткие просветы — тоже под знаком
      p.under = under;
      p.ok = under.reduce((m, q) => m + q[1] - q[0], 0) < p.fh * 0.62 && !under.some((q) => q[0] < 2);
      if (!p.ok) obs.push({ x0: 0, x1: Wd, y0: p.bTop, y1: p.bBot, k: 'M', el: p.el });
    }
    // старт: поперёк верхнего поля каталога — от левого края колонки к полосе
    const yS = Math.round(drop.y0 + clamp(drop.padT * 0.42, R0 * 0.7 + c, 60));
    // v4.1: лента входит из-за левого края экрана (а не начинается «в воздухе» над заголовком): начало — под кромкой
    const xS = -Math.round(w * 2), xC = Math.round(Math.max(xMin, R0 + c));
    const okTop = drop.padT > w + 2 * c && !hit(0, yS - bandH, xL + band, yS + bandH) && !hit(xC - cr, yS - cr, xC + cr, yS + cr);   // старт — без запаса на разворот
    const yEnd = Math.round(Math.min(foot.y1, H) - Math.max(cr, 40));
    let x = xL, y = yS, lastC = okTop ? yS : yS - vh;
    if (okTop) seg(xS, yS, xL, yS, 'tape');
    function bestCross(x, y, wa, wb, forced, tx) {
      let best = null;
      for (let yc = Math.round(wb); yc >= wa; yc -= step) {
        if (!corner(x, yc)) continue;
        if (pins.some((q) => yc > q.bTop - cr && yc < q.bBot + cr)) continue;   // в липком блоке ленте страницы не место
        const pin2 = pinAfter(yc + 1), stop2 = pin2 ? pin2.bTop : yEnd;
        const cands = tx != null ? [tx] : lanes(yc - cr, yc + cr + R0 * 2);
        for (const x2 of cands) {
          if (tx == null && Math.abs(x2 - x) < (forced ? band * 2.5 : Wd * 0.28)) continue;
          if (tx == null && !forced && pin2 && Math.abs(x2 - pin2.x) > 1 && pin2.bTop - yc < vh * 1.2) continue;   // впереди кадр — не уходить с его полосы
          if (!corner(x2, yc) || hit(Math.min(x, x2), yc - bandH, Math.max(x, x2), yc + bandH)) continue;
          const b2 = firstBlock(x2, yc + 1, stop2), run2 = (b2 ? b2.y0 - cr : stop2) - yc;
          // без «буквы П»: после перехода — длинный пробег; короткий — только до карусели/кадра, под которыми туннель
          if (run2 < Math.min(vh * (forced ? 0.3 : 0.5), stop2 - yc - 1) && !(forced && b2 && b2.k === 'M' && run2 > R0 * 2)) continue;
          if (tx != null && b2 && b2.y0 - cr < stop2) continue;          // к кадру — без новых препятствий
          const opp = (x2 < Wd / 2) !== (x < Wd / 2);
          let sc = (opp ? 500 : 0) + Math.min(Math.abs(x2 - x), Wd * 0.7) * 0.3 + Math.min(run2, vh * 1.4) * 0.35 + seamB(yc);
          sc += (x2 >= xMax - 1 || x2 <= xMin + 1) ? 120 : 0;              // поля — лучше, чем середина
          sc -= forced ? Math.max(0, wb - yc) * 0.3 : Math.abs(yc - (lastC + vh * 1.3)) * 0.3;
          if (!best || sc > best.sc) best = { x: x2, y: yc, sc };
        }
      }
      return best;
    }
    let guard = 0, ended = false;
    while (y < yEnd - 1 && guard++ < 60) {
      const pin = pinAfter(y);
      const yStop = pin && pin.bTop < yEnd ? pin.bTop : yEnd;
      const blk = firstBlock(x, y + 1, yStop + cr);
      const reach = blk ? Math.min(yStop, blk.y0 - cr) : yStop;
      const offPin = pin && pin.bTop < yEnd && Math.abs(x - pin.x) > 1;
      const blkM = !!(blk && blk.k === 'M');                       // карусель / кадр без полосы — под ними туннель, не обход
      const mustCross = (blk && !blkM && blk.y0 - cr < yStop) || (!blk && offPin);
      let wa = y + cr * 1.2, wb = reach;
      if (!mustCross) { wa = Math.max(wa, lastC + vh * RH0); wb = Math.min(reach, Math.max(lastC + vh * RH1, y + vh * 0.75), yEnd - vh * 0.6); }   // у самого низа — только финал
      else if (wb > lastC + vh * 0.55) wa = Math.max(wa, lastC + vh * 0.55);   // и вынужденный — не раньше, чем через полэкрана
      const best = wb >= wa ? bestCross(x, y, wa, wb, mustCross, !blk && offPin ? pin.x : null) : null;
      if (best) { seg(x, y, x, best.y, 'tape'); seg(x, best.y, best.x, best.y, 'tape'); x = best.x; y = best.y; lastC = y; continue; }
      if (!mustCross && !(blkM && reach - y < vh * 0.75)) {
        if (pin && pin.bTop < yEnd && !blk && pin.bTop - y < vh * 0.75) {   // в липкий кадр: лента едет в его координатах
          seg(x, y, x, pin.bTop, 'tape');
          const lx = x - pin.left, pi = pins.indexOf(pin), k = (pin.bBot - pin.bTop) / pin.fh;   // doc-эквивалент пропорционален
          let ly = 0;
          for (const [u0, u1] of pin.under.concat([[pin.fh, pin.fh]])) {
            if (u0 > ly + 1) seg(lx, ly, lx, u0, 'tape', { pin: pi, dy0: pin.bTop + ly * k, dy1: pin.bTop + u0 * k, mouthIn: u0 < pin.fh });
            if (u1 > u0) seg(lx, u0, lx, u1, 'tunnel', { pin: pi, dy0: pin.bTop + u0 * k, dy1: pin.bTop + u1 * k });
            ly = u1;
          }
          y = pin.bBot; continue;
        }
        // перехода в окне нет — спуститься и поискать дальше
        const yn = Math.min(reach, Math.max(wb, y + Math.max(vh * 0.5, 120)));
        if (yn > y + 1) { seg(x, y, x, yn, 'tape'); y = yn; continue; }
        if (!blk && !pin) { seg(x, y, x, yStop, 'tape'); y = yStop; continue; }   // страховка: путь свободен — до конца
      }
      if (!blk && !pin) { seg(x, y, x, yStop, 'tape'); y = yStop; continue; }
      // перекрыто и перейти нельзя — туннель под самым коротким блоком с препятствием
      const oy = blk ? Math.max(blk.y0, y + 1) : (pin ? pin.bTop + 1 : y + 1);
      const u = blk ? units.filter((q) => q.y0 <= oy + 1 && q.y1 > oy).sort((p, q) => (p.y1 - p.y0) - (q.y1 - q.y0))[0]
        : { sel: 'pin', y0: pin.bTop, y1: pin.bBot };
      if (!u || u.sel === '#footer' || u.y1 >= yEnd) { const ye = Math.max(y + R0, oy - cr); seg(x, y, x, ye, 'tape'); y = ye; ended = true; break; }
      const yIn = Math.max(y, Math.round(u.y0)), yOut = Math.round(u.y1);
      // выход: полоса, свободная ниже (лучше прежняя), поперёк под блоком — не видно
      const pin3 = pinAfter(yOut + 1), stop3 = pin3 ? pin3.bTop : yEnd;
      let x2 = x, bestRun = -1;
      for (const xc of [x, xL].concat(lanes(yOut, yOut + cr * 2))) {
        if (!corner(xc, yOut + cr)) continue;
        const b3 = firstBlock(xc, yOut + 1, stop3), run = (b3 ? b3.y0 : stop3) - yOut + (xc === x ? 120 : 0);
        if (run > bestRun) { bestRun = run; x2 = xc; }
      }
      const prev = S[S.length - 1];
      if (yIn > y + 1) seg(x, y, x, yIn, 'tape', { mouthIn: true });
      if (prev && prev.t === 'tunnel' && yIn <= y + 1) { prev.b = { x: x2, y: yOut }; }
      else { if (yIn <= y + 1 && prev) prev.mouthIn = true; seg(x, yIn, x2, yOut, 'tunnel'); }
      x = x2; y = yOut;
    }
    // склеить соседние отрезки на одной прямой
    for (let i = S.length - 1; i > 0; i--) {
      const a = S[i - 1], b = S[i];
      if (a.t === 'tape' && b.t === 'tape' && a.pin == null && b.pin == null && !a.mouthIn && a.a.x === a.b.x && b.a.x === b.b.x && a.b.x === b.a.x && Math.abs(a.b.y - b.a.y) < 0.5) { a.b = b.b; a.mouthIn = b.mouthIn; S.splice(i, 1); }
    }
    // финал: не ниже H − 0,42 экрана; поворот к центру по свободной полосе подвала, если влезает, иначе — конец на полосе
    let last = S[S.length - 1];
    const tail = Math.round(R0 * 1.25 + w * 0.5), bh2 = Math.max(w / 2, R0 * 0.75, QUIET ? w * 1.32 : CROSS_W(w, Wd) * 0.62) + c;   // полуразмах креста (с поворотом и «шлепком»)
    const yF0 = Math.min(last.b.y, Math.round(H - vh * 0.42));
    let fin = null;
    if (last.t === 'tape' && last.pin == null && last.a.x === last.b.x) {
      const lx = last.b.x, dir = lx > Wd / 2 ? -1 : 1;
      const tailX = Math.max(tail, QUIET ? 0 : CROSS_W(w, Wd) * 0.62 + c);   // крест шире хвоста рулона
      for (let yy = yF0; yy > Math.max(foot.y0 + R0 * 2, yF0 - vh * 0.45, last.a.y + R0 * 2); yy -= 6) {
        const need = Math.max(140, w * 6), x1 = lx + dir * (need + tailX);
        if (x1 < xMin || x1 > xMax) break;
        if (!hit(Math.min(lx, x1) - cr, yy - bh2, Math.max(lx, x1) + cr, yy + bh2) && !firstBlock(lx, yy - R0, yy + R0)) {
          let len = need;
          while (len < Math.min(Wd * 0.3, 360) && !hit(Math.min(lx, lx + dir * (len + 40 + tailX)) - cr, yy - bh2, Math.max(lx, lx + dir * (len + 40 + tailX)) + cr, yy + bh2)) len += 40;
          last.b.y = yy; seg(lx, yy, lx + dir * len, yy, 'tape');
          fin = { tail };
          break;
        }
      }
    }
    if (!fin) {
      last = S[S.length - 1];
      if (last.t === 'tape' && last.pin == null && last.a.x === last.b.x) {
        // конец на полосе: ищем вверх место, где крест (сдвинут внутрь страницы) и докат рулона ни на что не ложатся
        const hx = QUIET ? w * 1.4 : CROSS_W(w, Wd) * 0.62, cx = clamp(last.b.x, hx + 2, Wd - hx - 2);
        let yy = Math.max(last.a.y + R0, Math.min(last.b.y, yF0) - tail);
        for (let y2 = yy; y2 > last.a.y + R0; y2 -= 6) if (!hit(cx - hx, y2 - hx, cx + hx, y2 + hx) && !hit(last.b.x - cr, y2, last.b.x + cr, y2 + tail + cr)) { yy = y2; break; }
        last.b.y = yy;
      }
      fin = { tail };
    }
    void ended;
    return { S, fin };
  }

  /* цвет: лайм — только в блоках без своего зелёного; смена — на стыке блоков. Раз почернев, лента дальше чёрная */
  const dyA = (g) => (g.pin != null ? g.dy0 : g.a.y), dyB = (g) => (g.pin != null ? g.dy1 : g.b.y);
  function colorize(S, E) {
    const greenUnit = (u) => E.greens.some((q) => q.y1 > u.y0 + 2 && q.y0 < u.y1 - 2 && !(q.el && q.el.closest('#hero')));
    const unitAt = (y) => E.units.filter((q) => q.y0 <= y && q.y1 > y).sort((p, q) => (p.y1 - p.y0) - (q.y1 - q.y0))[0];
    if (TAPE !== 'lime') { S.forEach((g) => { g.col = 'black'; const u = unitAt(g.b.y); g.greenU = !!(u && greenUnit(u)); }); return S; }
    const colAt = (y, col) => { const u = unitAt(y); return col === 'black' || (u && greenUnit(u)) ? 'black' : 'lime'; };
    const out = [];
    let col = 'lime';
    for (const g of S) {
      if (g.t === 'tunnel') { g.col = col; out.push(g); continue; }
      if (g.pin != null || g.a.y === g.b.y) { g.col = col = colAt((dyA(g) + dyB(g)) / 2, col); out.push(g); continue; }
      // вертикаль: режем по стыкам блоков, где меняется цвет
      let y0 = g.a.y;
      const cuts = E.units.map((u) => u.y0).filter((yy) => yy > g.a.y + 4 && yy < g.b.y - 4).sort((p, q) => p - q);
      for (const yc of cuts.concat([g.b.y])) {
        const c2 = colAt((y0 + yc) / 2, col), lastG = out[out.length - 1];
        if (lastG && lastG.t === 'tape' && lastG.pin == null && lastG.col === c2 && lastG.a.x === g.a.x && lastG.b.x === g.a.x && lastG.b.y === y0) lastG.b = { x: g.a.x, y: yc };
        else out.push({ a: { x: g.a.x, y: y0 }, b: { x: g.a.x, y: yc }, t: 'tape', col: c2 });
        col = c2; y0 = yc;
      }
      if (g.mouthIn) out[out.length - 1].mouthIn = true;
    }
    for (let i = 0; i < out.length; i++) if (out[i].t === 'tunnel' && out[i + 1]) out[i].col = out[i + 1].col;   // смена — под блоком
    for (const g of out) { const u = unitAt(g.b.y); g.greenU = !!(u && greenUnit(u)); }
    return out;
  }

  /* ═════════════ 3. ВРЕМЕННАЯ ШКАЛА: прокрутка → путь s + события ═════════════ */
  function timeline(segs, fin, E) {
    const { vh, maxY, R0, rc } = E;
    let s = 0;
    for (const g of segs) { g.len = Math.hypot(g.b.x - g.a.x, g.b.y - g.a.y); g.s0 = s; s += g.len; g.s1 = s; g.hd = Math.atan2(g.b.y - g.a.y, g.b.x - g.a.x); }
    const L = s + fin.tail;            // рулон докатывается за конец ленты на «хвост»
    const trailEnd = s;
    // смены рулона: где меняется цвет ленты (в туннеле — мгновенно и невидимо)
    const swaps = [];
    for (let i = 1; i < segs.length; i++) {
      const a = segs[i - 1], b = segs[i];
      if (a.t === 'tape' && b.t === 'tape' && a.col !== b.col) swaps.push({ s: b.s0, col: b.col, vis: true });
      if (b.t === 'tunnel' && a.col !== b.col) swaps.push({ s: b.s0 + b.len / 2, col: b.col, vis: false });
    }
    // ключи: Y (прокрутка) ↔ s; голова держится на ~56 % высоты экрана, поперечные пробеги — пока стык поднимается
    const A = 0.56, K = [];
    const first = segs[0];
    // лаймовый рулон падает, когда 3D-G из hero уже ушла из кадра («один зелёный на экран»): замер — G уходит,
    // когда стык hero/каталог поднимается до ~0,45 экрана (desktop) / ~0,75 (телефон, hero static)
    const fD = TAPE === 'lime' && segs[0].col === 'lime' ? (E.Wd >= 768 ? 0.5 : 0.74) : 0.82;
    const Yd = E.drop.y0 - fD * vh;
    K.push({ Y: Yd, s: 0, ev: 'drop', e: 0 });
    K.push({ Y: Yd + vh * (QUIET ? 0.06 : 0.1), s: 0, ev: 'drop', e: 1 });
    for (const g of segs) {
      const horiz = g.a.y === g.b.y && g.pin == null;
      let a1 = A;
      if (horiz) { const prevA = K[K.length - 1].a == null ? 0.8 : K[K.length - 1].a; a1 = Math.max(0.36, prevA - 0.22); }
      const sw = swaps.find((q) => q.vis && Math.abs(q.s - g.s0) < 0.5);
      if (sw) {   // пауза на смену рулона: путь стоит, идёт событие
        const Yp = K[K.length - 1].Y;
        K.push({ Y: Yp + vh * 0.24, s: g.s0, ev: 'swap', e: 1, a: A - 0.24 });
        K[K.length - 2].ev = 'swap'; K[K.length - 2].e = 0;
      }
      const yb = dyB(g);
      K.push({ Y: yb - a1 * vh, s: g.s1, a: a1, y: yb, h: horiz });
    }
    // финальный блок считается от конца прокрутки назад: поворот → докат → крест и рулон на торец
    const lim = maxY - 1, lastSeg = segs[segs.length - 1], turn = lastSeg.a.y === lastSeg.b.y && lastSeg.pin == null && segs.length > 1;
    const Yf1 = lim, Yf0 = lim - vh * 0.12, Yt = Yf0 - vh * 0.06;
    K.push({ Y: Yt, s: L }); K.push({ Y: Yf0, s: L, ev: 'fin', e: 0 }); K.push({ Y: Yf1, s: L, ev: 'fin', e: 1 });
    const iEnd = K.length - 4;                       // конец ленты
    K[iEnd].Y = Math.min(K[iEnd].Y, Yt - vh * 0.03);
    if (turn) K[iEnd - 1].Y = Math.min(K[iEnd - 1].Y, K[iEnd].Y - vh * 0.14);   // угол поворота
    // голова не уходит за низ экрана (0,92); монотонность (не быстрее 4× прокрутки) — назад от конца, потом вперёд
    for (const k of K) if (k.y != null && k.Y < k.y - vh * 0.92) k.Y = k.y - vh * 0.92;
    const gapOf = (i) => Math.max(1, (K[i].s - K[i - 1].s) * (K[i].h ? 0.16 : 0.25), K[i].ev && K[i].e === 1 ? vh * 0.05 : 0);
    for (let i = K.length - 2; i >= 0; i--) { if (K[i].Y > K[i + 1].Y - gapOf(i + 1)) K[i].Y = K[i + 1].Y - gapOf(i + 1); else if (i < K.length - 5) break; }
    for (let i = 1; i < K.length; i++) if (K[i].Y < K[i - 1].Y + gapOf(i)) K[i].Y = K[i - 1].Y + gapOf(i);
    // радиусы: у каждого рулона своя длина (лаймовый кончается на смене)
    const rolls = [];
    let s0 = 0, col = segs[0].col;
    for (const q of swaps) { rolls.push({ s0, s1: q.s, col }); s0 = q.s; col = q.col; }
    rolls.push({ s0, s1: L, col });
    return { K, L, trailEnd, swaps, rolls };
  }
  function lookup(T, Y) {
    const K = T.K;
    if (Y <= K[0].Y) return { s: 0, ev: 'drop', e: 0, pre: true };
    if (Y >= K[K.length - 1].Y) return { s: T.L, ev: 'fin', e: 1 };
    let lo = 0, hi = K.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (K[m].Y <= Y) lo = m; else hi = m; }
    const a = K[lo], b = K[hi], t = (Y - a.Y) / Math.max(1e-6, b.Y - a.Y);
    const s = a.s + (b.s - a.s) * t;
    if (a.ev && b.ev === a.ev && a.e === 0 && b.e === 1) return { s, ev: a.ev, e: t };
    return { s };
  }

  /* ═════════════ 4. СЛОЙ: лента, загибы, туннели, крест, рулон ═════════════ */
  const ST = { built: false, stage: null, E: null, segs: [], T: null, runs: [], folds: [], mouths: [], xs: [], roll: null, cv: null, css: null,
    v: null, gl: 'wait', ys: 0, lastKey: '', vis: true, cs: 0, active: -1, sizes: null, planned: 0 };

  function el(tag, cls, parent) { const e = D.createElement(tag); e.className = cls; if (parent) parent.appendChild(e); return e; }
  // картинки вместо CSS-градиентов (см. roll.css): рисуются один раз на процессорном 2D-холсте
  const BAKED = {}, BAKING = {};
  // асинхронно: PNG кодирует toBlob вне главного потока; до готовности у элемента просто нет тени/складки
  function bakeTo(el, prop, key, w, h, draw) {
    if (BAKED[key]) { el.style.setProperty(prop, BAKED[key]); return; }
    (BAKING[key] = BAKING[key] || []).push([el, prop]);
    if (BAKING[key].length > 1) return;
    const c = D.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d', { willReadFrequently: true }), w, h);
    const done = (u) => { BAKED[key] = 'url(' + u + ')'; for (const [e, pr] of BAKING[key]) e.style.setProperty(pr, BAKED[key]); delete BAKING[key]; };
    if (c.toBlob) c.toBlob((b) => done(b ? URL.createObjectURL(b) : c.toDataURL()), 'image/png'); else done(c.toDataURL());
  }
  const stops = (gr, list) => { for (const [o, col] of list) gr.addColorStop(o, col); return gr; };
  function bakeAll(E, st, css) {
    bakeTo(st, '--mouth-in', 'mi', 4, 32, (g, w, h) => { g.fillStyle = stops(g.createLinearGradient(0, 0, 0, h), [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.55)']]); g.fillRect(0, 0, w, h); });
    bakeTo(st, '--mouth-out', 'mo', 4, 32, (g, w, h) => { g.fillStyle = stops(g.createLinearGradient(0, h, 0, 0), [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.55)']]); g.fillRect(0, 0, w, h); });
    // мультяшная тень рулона: плоское пятно в две ступени
    bakeTo(css, '--shadow', 'sh2', 64, 64, (g) => {
      g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(32, 32, 31, 31, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(0,0,0,.26)'; g.beginPath(); g.ellipse(32, 32, 23, 23, 0, 0, Math.PI * 2); g.fill();
    });
    // тело рулона сверху — тун: плоские ступени тени к краям цилиндра, белая полоса-блик, чёрный контур по краям
    bakeTo(css, '--shade', 'sd2', 64, 16, (g, w, h) => {
      g.fillStyle = 'rgba(0,0,0,.42)'; g.fillRect(0, 0, 9, h); g.fillRect(w - 11, 0, 11, h);
      g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(9, 0, 7, h); g.fillRect(w - 20, 0, 9, h);
      g.fillStyle = 'rgba(255,255,255,.38)'; g.fillRect(19, 0, 3, h);
      g.fillStyle = '#000'; g.fillRect(0, 0, 3, h); g.fillRect(w - 3, 0, 3, h);
    });
  }
  function foldTo(el, ang) {   // загиб: второй слой ленты в тени + ЧЁТКАЯ складка (чёрная линия и белый блик) по диагонали
    const k = Math.round(ang);
    bakeTo(el, '--fold', 'fold2' + k, 48, 48, (g, w, h) => {
      const a = (k * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a), L = w;
      g.save(); g.translate(w / 2, h / 2);
      // полуплоскость к внешнему углу — тень второго слоя
      g.beginPath();
      g.moveTo(-dy * L, dx * L); g.lineTo(-dy * L + dx * L, dx * L + dy * L); g.lineTo(dy * L + dx * L, -dx * L + dy * L); g.lineTo(dy * L, -dx * L); g.closePath();
      g.fillStyle = 'rgba(0,0,0,.22)'; g.fill();
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-dy * L - dx * 3.5, dx * L - dy * 3.5); g.lineTo(dy * L - dx * 3.5, -dx * L - dy * 3.5); g.stroke();
      g.strokeStyle = '#000'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(-dy * L, dx * L); g.lineTo(dy * L, -dx * L); g.stroke();
      g.restore();
    });
  }
  // рваный конец: спрайт end-* (с контуром и загнутым краем); левый — зеркально
  function tornCap(parent, col, w, atEnd, x) {
    const h = w / END_BODY, cw = h * END_AR[col];
    const e = el('i', 'rl-end rl-end--' + col + (atEnd ? '' : ' rl-end--l'), parent);
    e.style.cssText = `left:${(atEnd ? x - cw : x).toFixed(1)}px;top:${(-END_TOP * h).toFixed(1)}px;width:${cw.toFixed(1)}px;height:${h.toFixed(1)}px`;
    return cw;
  }

  function build(E, segs, T, fin) {
    const st = ST.stage;
    st.textContent = '';
    st.style.height = Math.ceil(E.H) + 'px';
    const { w, pad } = E;
    const hh = w / 2 + pad;
    ST.runs = []; ST.folds = []; ST.mouths = []; ST.xs = []; ST.sts = [];
    // зеркала липких кадров: тот же ход, что у кадра (sticky внутри блока той же высоты), лента внутри стоит вместе с кадром
    ST.pins = (E.pins || []).map((pn) => {
      const o = el('div', 'rl-pin', st);
      o.style.cssText = `top:${pn.bTop.toFixed(1)}px;height:${(pn.bBot - pn.bTop).toFixed(1)}px`;
      const inn = el('div', 'rl-pin-in', o);
      inn.style.cssText = `top:${pn.top}px;height:${pn.fh.toFixed(1)}px;margin-left:${pn.left.toFixed(1)}px;width:${pn.fw.toFixed(1)}px`;
      return inn;
    });
    const tape = segs.filter((g) => g.t === 'tape');
    segs.forEach((g, i) => {
      if (g.t !== 'tape') return;
      const prev = segs[i - 1], next = segs[i + 1];
      const contIn = prev && prev.t === 'tape', contOut = next && next.t === 'tape';
      const sameIn = contIn && prev.col === g.col, sameOut = contOut && next.col === g.col;
      // кусок тянется на пол-ширины за угол (покрыть квадрат загиба); при смене цвета — внахлёст с рваным концом
      const ext0 = contIn ? (sameIn ? 0 : w * 0.15) : 0, ext1 = contOut ? (sameOut ? w / 2 : w * 0.45) : 0;
      const len = g.len + ext0 + ext1, tile = w * TILE_AR[g.col];
      const ox = g.a.x - Math.cos(g.hd) * ext0, oy = g.a.y - Math.sin(g.hd) * ext0;
      const torn0 = (!contIn || !sameIn) && !(prev && prev.t === 'tunnel'), torn1 = (!contOut && !g.mouthIn) || (contOut && !sameOut);
      // длинный пробег режем на куски ≤ CH: слой раскрываемого куска (will-change) маленький, остальные — статичная картинка
      const CH = Math.max(240, Math.round(E.vh * 0.6)), n = Math.max(1, Math.ceil(len / CH));
      for (let k = 0; k < n; k++) {
        const d0 = (len * k) / n, ln = len / n + (k < n - 1 ? 1 : 0);   // +1 px внахлёст — без щели между кусками
        const run = el('div', 'rl-run rl--' + g.col, g.pin != null ? ST.pins[g.pin] : st);
        run.style.cssText = `left:${(ox + Math.cos(g.hd) * d0).toFixed(1)}px;top:${(oy + Math.sin(g.hd) * d0 - hh).toFixed(1)}px;width:${ln.toFixed(1)}px;height:${2 * hh}px;transform:rotate(${(g.hd * 180 / Math.PI).toFixed(2)}deg)`;
        const win = el('div', 'rl-win', run), tp = el('div', 'rl-tape', win);
        const t0 = torn0 && k === 0, t1 = torn1 && k === n - 1;
        // под рваным концом тайл короче: торец рисует спрайт (его левая половина — тело ленты внахлёст на тайл)
        const cw = (w / END_BODY) * END_AR[g.col], cut0 = t0 ? cw * 0.5 : 0, cut1 = t1 ? cw * 0.5 : 0;
        const tl = Math.max(1, ln - cut0 - cut1);
        tp.style.cssText = `top:${pad}px;left:${cut0.toFixed(1)}px;height:${w}px;width:${tl.toFixed(1)}px;background-size:${tile.toFixed(1)}px ${w}px;background-position:${(-((g.s0 - ext0 + d0 + cut0) % tile)).toFixed(1)}px 0`;
        if (t0) tornCap(tp, g.col, w, false, -cut0);
        if (t1) tornCap(tp, g.col, w, true, tl + cut1);
        ST.runs.push({ g, run, win, tp, len: ln, ext0, s0: g.s0 - ext0 + d0, state: -2 });
      }
      // загиб 45° на углу того же цвета: тень второго слоя + чёткая складка
      if (sameOut && Math.abs(next.hd - g.hd) > 0.1) {
        const f = el('div', 'rl-fold', g.pin != null ? ST.pins[g.pin] : st);
        const dx = Math.cos(g.hd) - Math.cos(next.hd), dy = Math.sin(g.hd) - Math.sin(next.hd);
        const ang = Math.atan2(dx, -dy) * 180 / Math.PI;
        f.style.cssText = `left:${(g.b.x - w / 2).toFixed(1)}px;top:${(g.b.y - w / 2).toFixed(1)}px;width:${w}px;height:${w}px`;
        foldTo(f, ang);
        ST.folds.push({ f, s: g.s1 + w * 0.5, on: null, g, pin: g.pin });
      }
    });
    // устья туннелей: тень края блока на ленте
    segs.forEach((g) => {
      if (g.t !== 'tunnel') return;
      const host = g.pin != null ? ST.pins[g.pin] : st;
      const a = el('div', 'rl-mouth rl-mouth--in', host), b = el('div', 'rl-mouth rl-mouth--out', host);
      const mh = Math.max(8, w * 0.8);
      a.style.cssText = `left:${(g.a.x - w / 2 - 2).toFixed(1)}px;top:${(g.a.y - mh).toFixed(1)}px;width:${w + 4}px;height:${mh}px`;
      b.style.cssText = `left:${(g.b.x - w / 2 - 2).toFixed(1)}px;top:${g.b.y.toFixed(1)}px;width:${w + 4}px;height:${mh}px`;
      ST.mouths.push({ e: a, s: g.s0 - 2, on: null }, { e: b, s: g.s1 + 1, on: null });
    });
    // стикеры на загибах (дозированно): угол свободен на радиус рулона (план это гарантирует) — стикер в него вписан;
    // только где лайм уместен: лаймовая лента или блок без своего зелёного
    if (STK && ST.folds.length) {
      const names = ['arrow-turn', 'sparkle', 'stars', 'crown', 'arrow-zigzag', 'stamp'];
      const ok = ST.folds.filter((f) => f.pin == null && (TAPE === 'lime' ? f.g.col === 'lime' : !f.g.greenU));   // лента почернела — значит, рядом свой зелёный
      const n = Math.min(STK, ok.length), MS = GV.mascot;
      for (let k = 0; k < n; k++) {
        const f = ok[Math.floor((ok.length / n) * (k + 0.5))], nm = names[k % names.length], src = MS && MS.sticker && MS.sticker(nm);
        if (!src) continue;
        const ar = (MS.stickerAR && MS.stickerAR[nm]) || 1, sz = Math.round((E.R0 + E.c) * 1.5);
        const sw = ar >= 1 ? sz : sz * ar, sh = ar >= 1 ? sz / ar : sz, rot = (k % 2 ? 1 : -1) * (8 + (k * 5) % 9);
        const e = el('i', 'rl-st', st), sx = clamp(f.g.b.x - sw / 2, sw * 0.15 + 4, E.Wd - sw * 1.15 - 6);   // с поворотом — внутри страницы
        e.style.cssText = `left:${sx.toFixed(1)}px;top:${(f.g.b.y - sh / 2).toFixed(1)}px;width:${sw.toFixed(1)}px;height:${sh.toFixed(1)}px;--r:${rot}deg;background-image:url("${src}")`;
        ST.sts.push({ e, s: f.s + w * 1.5, on: null });
      }
    }
    // финал: мультяшный крест tape-cross поверх конца ленты (тихий режим — один чёрный рваный кусок поперёк)
    const lastTape = tape[tape.length - 1];
    if (lastTape) {
      const ex = lastTape.b.x, ey = lastTape.b.y, base = lastTape.hd;
      if (QUIET) {
        const len = Math.round(w * 2.6), hw = Math.round(w * 0.95), cw = (hw / END_BODY) * END_AR.black;
        const x = el('div', 'rl-x rl-x--piece', st);
        x.style.cssText = `left:${(ex - len / 2).toFixed(1)}px;top:${(ey - hw / 2).toFixed(1)}px;width:${len}px;height:${hw}px;--r:${((base + Math.PI / 2 + 0.1) * 180 / Math.PI).toFixed(1)}deg`;
        const tp = el('i', 'rl-x-tp', x);
        tp.style.cssText = `left:${(cw * 0.5).toFixed(1)}px;right:${(cw * 0.5).toFixed(1)}px;background-size:${(hw * TILE_AR.black).toFixed(1)}px ${hw}px`;
        tornCap(x, 'black', hw, false, 0); tornCap(x, 'black', hw, true, len);
        ST.xs.push({ e: x, k: 0, on: null });
      } else {
        const S = CROSS_W(w, E.Wd), hx = S * 0.62, cx = clamp(ex, hx + 2, E.Wd - hx - 2);
        const x = el('div', 'rl-x rl-x--cross', st);
        x.style.cssText = `left:${(cx - S / 2).toFixed(1)}px;top:${(ey - S / 2).toFixed(1)}px;width:${S}px;height:${S}px;--r:${(-6 + ((base * 180 / Math.PI) % 12)).toFixed(1)}deg`;
        ST.xs.push({ e: x, k: 0, on: null });
      }
    }
    // рулон — CSS-спрайт: тень, тело (вид сверху, печать едет), торец-эллипс (крутится; лёжа — круг)
    const cs = Math.ceil(E.R0 * 2.9 + E.sl * 2 + 8);
    ST.cs = cs;
    const roll = el('div', 'rl-roll', st);
    roll.style.width = roll.style.height = cs + 'px';
    const css = el('div', 'rl-css', roll);
    css.innerHTML = '<i class="rl-css-sh"></i><i class="rl-css-body"><i class="rl-css-tex"></i></i><i class="rl-css-face"></i>';
    ST.roll = roll; ST.css = css;
    idle(() => bakeAll(E, st, css), 800);   // картинки теней — отдельной задачей в простое
    css.style.setProperty('--w', E.w + 'px'); css.style.setProperty('--r0', (2 * E.R0) + 'px');
    if (DBG) for (const o of E.obs) { const d = el('i', 'rl-dbg rl-dbg--' + o.k, st); d.style.cssText = `left:${o.x0}px;top:${o.y0}px;width:${o.x1 - o.x0}px;height:${o.y1 - o.y0}px`; }
    ST.active = -1;
  }

  /* ═════════════ 5. КАДР ═════════════ */
  function rollAt(s) {
    const T = ST.T, rl = T.rolls.find((q) => s >= q.s0 - 0.01 && s <= q.s1 + 0.01) || T.rolls[T.rolls.length - 1];
    // лаймовый к смене почти пуст (тонкий слой на шпуле), последний к финалу — на четверть: есть что положить на торец
    const E = ST.E, um = rl === T.rolls[T.rolls.length - 1] ? 0.74 : 0.95, Lk = Math.max(1, (rl.s1 - rl.s0) / um), u = clamp((s - rl.s0) / Lk, 0, 1);
    const a = E.R0 * E.R0 - E.rc * E.rc, Rr = Math.sqrt(E.rc * E.rc + a * (1 - u));
    const sp = (2 * Lk * (E.R0 - Rr)) / Math.max(1, a);   // ∫ds/R — честное качение худеющего рулона: θ = 2L(R0−R)/(R0²−rc²)
    return { col: rl.col, R: Rr, sp, rl };
  }
  function headAt(s) {
    const segs = ST.segs, w = ST.E.w;
    let i = segs.findIndex((g) => s <= g.s1 + 1e-6);
    if (i < 0) {   // за концом ленты — хвост
      const g = segs[segs.length - 1], d = s - g.s1;
      return { x: g.b.x + Math.cos(g.hd) * d, y: g.b.y + Math.sin(g.hd) * d, hd: g.hd, seg: segs.length - 1 };
    }
    const g = segs[i], t = (s - g.s0) / Math.max(1e-6, g.len);
    let hd = g.hd;
    // разворот на углу — уже ПОСЛЕ угла, пока рулон отъезжает от него на T2: у края страницы (полоса x=378 при Ø48)
    // лёгший поперёк рулон иначе на миг вылезал за край экрана
    const T2 = Math.max(w * 1.5, ST.E.R0 * 1.1);
    const prev = segs[i - 1];
    const turn = (h1, h2, k) => { let d = h2 - h1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return h1 + d * sstep(k); };
    if (prev && prev.t === 'tape' && g.t === 'tape' && prev.pin == g.pin && s - g.s0 < T2 && Math.abs(prev.hd - g.hd) > 0.1) hd = turn(prev.hd, g.hd, (s - g.s0) / T2);
    return { x: g.a.x + (g.b.x - g.a.x) * t, y: g.a.y + (g.b.y - g.a.y) * t, hd, seg: i, pin: g.pin };
  }
  function frame(Y) {
    if (!ST.built) return;
    const T = ST.T, E = ST.E, q = lookup(T, Y), s = q.s;
    // лента: полные — видны, будущие — скрыты, активная — окно едет навстречу ленте (только transform)
    const drawn = Math.min(s, T.trailEnd);
    if (!ST.late && s > T.L * 0.55) { ST.late = true; ST.stage.classList.add('rl-late'); }
    for (let i = 0; i < ST.runs.length; i++) {
      const r = ST.runs[i], vis = drawn - r.s0;
      const stt = vis <= 0.5 ? -1 : vis >= r.len - 0.5 ? 1 : 0;
      if (stt === 0) {
        const off = (r.len - vis).toFixed(2);
        r.win.style.transform = `translate3d(-${off}px,0,0)`; r.tp.style.transform = `translate3d(${off}px,0,0)`;
        if (r.state !== 0) { r.run.style.visibility = 'visible'; r.run.classList.add('is-live'); }
      } else if (r.state !== stt) {
        r.run.style.visibility = stt > 0 ? 'visible' : 'hidden';
        r.win.style.transform = ''; r.tp.style.transform = ''; r.run.classList.remove('is-live');
      }
      r.state = stt;
    }
    for (const f of ST.folds) { const on = drawn >= f.s - 0.5; if (on !== f.on) { f.f.style.visibility = on ? 'visible' : 'hidden'; f.on = on; } }
    for (const m of ST.mouths) { const on = drawn >= m.s; if (on !== m.on) { m.e.style.visibility = on ? 'visible' : 'hidden'; m.on = on; } }
    const finE = Y >= T.K[T.K.length - 1].Y ? 1 : q.ev === 'fin' ? q.e : 0;
    // стикеры на загибах: «шлёпаются», когда лента прошла угол
    for (const x of ST.sts) {
      const on = drawn >= x.s;
      if (on === x.on) continue;
      x.e.style.visibility = on ? 'visible' : 'hidden';
      if (on && x.on === false && !STATIC() && x.e.animate) x.e.animate([{ transform: 'rotate(var(--r)) scale(1.5)', opacity: 0 }, { opacity: 1, offset: .3 }, { transform: 'rotate(var(--r)) scale(1)', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.3,1.4,.5,1)' });
      x.on = on;
    }
    // финальный крест: приподнят и чуть больше → прижат (по прокрутке)
    ST.xs.forEach((x, k) => {
      const t = clamp(finE * 2.2 - k * 0.55, 0, 1), on = t > 0;
      if (on !== x.on || on) {
        x.e.style.visibility = on ? 'visible' : 'hidden';
        if (on) { const k2 = 1 - Math.pow(1 - t, 3); x.e.style.transform = `rotate(var(--r)) scale(${(1.12 - 0.12 * k2).toFixed(3)})`; x.e.style.opacity = Math.min(1, t * 3).toFixed(2); }
        x.on = on;
      }
    });
    // рулон
    const h = headAt(s), rr = rollAt(s);
    let col = rr.col, lift = 0, alpha = 1, tip = finE, R2 = rr.R, scale = 1;
    if (q.pre) alpha = 0;
    if (q.ev === 'drop') { const e = q.e; lift = 1 - e; alpha = clamp(e * 3, 0, 1); scale = 1 + 0.55 * Math.pow(1 - e, 2) - Math.sin(e * Math.PI) * 0.0; }
    if (q.ev === 'swap') {
      // лаймовый кончился: шпуля ложится на торец и тает → сверху падает чёрный рулон
      const e = q.e, k = T.swaps.findIndex((z) => Math.abs(z.s - s) < 1), was = T.rolls[Math.max(0, k)], nxt = T.rolls[Math.max(0, k) + 1] || was;
      if (e < 0.48) { const t = e / 0.48; col = was.col; R2 = rr.R; tip = 0; alpha = 1 - sstep((t - 0.45) / 0.55); scale = 1 - 0.35 * sstep(t); }   // v4.1: не ложится на торец (круг 2R задевал кнопки рядом со стыком) — сжимается и тает
      else { const t = (e - 0.48) / 0.52; col = nxt.col; R2 = E.R0; lift = 1 - t; alpha = clamp(t * 3, 0, 1); scale = 1 + 0.06 * Math.pow(1 - t, 2); tip = 0; }   // новый рулон проявляется на месте, без «падения» крупным планом
    }
    if (tip > 0 && finE > 0) R2 = rr.R;
    // туннель: рулон срезается по стыку и скрывается под блоком
    let clip = '';
    const g = ST.segs[h.seg], cs = ST.cs, half = cs / 2;
    if (g && g.t === 'tunnel') {
      const dIn = h.y - g.a.y, dOut = g.b.y - h.y;
      if (dIn < E.R0 * 1.6) clip = `inset(0 0 ${clamp(half + dIn, 0, cs).toFixed(1)}px 0)`;
      // туннель в кадре-пине, уходящий под нижнюю кромку кадра, — выхода в кадре нет (лента продолжается ниже кадра)
      else if (dOut < E.R0 * 1.6 && !(g.pin != null && g.b.y >= E.pins[g.pin].fh - 2)) clip = `inset(${clamp(half + dOut, 0, cs).toFixed(1)}px 0 0 0)`;
      else alpha = 0;
    } else {
      const nx = ST.segs[h.seg + 1], pv = ST.segs[h.seg - 1];
      if (nx && nx.t === 'tunnel' && nx.a.y - h.y < half) clip = `inset(0 0 ${clamp(half - (nx.a.y - h.y), 0, cs).toFixed(1)}px 0)`;
      if (pv && pv.t === 'tunnel' && h.y - pv.b.y < half) clip = `inset(${clamp(half - (h.y - pv.b.y), 0, cs).toFixed(1)}px 0 0 0)`;
    }
    // поперёк курса рулон ≈ w, вдоль — 2R; лёжа на торце — круг 2R: держим целиком в пределах страницы
    { const ext = (tip > 0 ? Math.max(R2, E.w / 2 + E.sl) : R2 * Math.abs(Math.cos(h.hd)) + (E.w / 2 + E.sl) * Math.abs(Math.sin(h.hd))) * scale + 3, W0 = h.pin != null ? E.pins[h.pin].fw : E.Wd;
      ST.lastR = R2; ST.lastScale = scale;
      if (h.x + ext > W0) h.x = W0 - ext; if (h.x - ext < 0) h.x = ext; }
    const roll = ST.roll, host = h.pin != null && ST.pins[h.pin] ? ST.pins[h.pin] : ST.stage;
    if (roll.parentNode !== host) host.appendChild(roll);   // в липком кадре рулон едет вместе с кадром
    roll.style.transform = `translate3d(${(h.x - half).toFixed(2)}px,${(h.y - half).toFixed(2)}px,0) scale(${scale.toFixed(3)})`;
    // не 0: прозрачность ровно 0 выключает отрисовку слоя, и браузер пересобирает слои страницы (в программном растре —
    // перерастр крупных слоёв 0,2–0,8 с). 0,002 глазом не видно, слой живёт
    roll.style.opacity = Math.max(0.002, alpha).toFixed(3);
    if (roll.dataset.clip !== clip) { roll.style.clipPath = clip; roll.dataset.clip = clip; }
    const pose = { hd: +h.hd.toFixed(4), R: +R2.toFixed(2), sp: +(rr.sp + (q.ev === 'swap' && q.e < 0.48 ? 0 : 0)).toFixed(3), tip: +tip.toFixed(3), mat: col, sh: +(1 - lift).toFixed(3), x: Math.round(h.x) };
    drawRoll(pose, h, alpha);
  }
  // мультяшный CSS-рулон. Тело (вид сверху) и тень поворачиваются только на кратные 90° (разворот на углу — щелчком):
  // произвольный угол у растрового слоя — новые программы растра и разовая компиляция 0,3–0,8 с в программном растре
  // (замер T1). Торец — свой композитный слой (will-change), его вращение и сжатие ничего не перерисовывают.
  function drawRoll(p, h, alpha) {
    if (alpha <= 0.01) return;
    const E = ST.E, c = ST.css;
    const hd = Math.round(p.hd / (Math.PI / 2)) * 90, hr = hd * Math.PI / 180;
    // торец — к глазу: при вертикальном курсе — к центру экрана, при горизонтальном — вниз (глаз ниже рулона)
    const toC = Math.sign((R.clientWidth / 2 - p.x) * -Math.sin(hr)) || 1;
    const side = Math.abs(Math.sin(hr)) > 0.5 ? (faceOut(E.Wd) ? -toC : toC) : (Math.cos(hr) > 0 ? 1 : -1);
    const kk = FACE_K + (1 - FACE_K) * clamp(p.tip, 0, 1);
    c.style.setProperty('--hd', hd + 'deg');
    c.style.setProperty('--rl', (Math.round(4 * p.R) / 2).toFixed(1) + 'px');   // шаг 0,5 px: размер меняется редко
    const tp = p.tip >= 0.5 ? '1' : '0'; if (c.dataset.tip !== tp) c.dataset.tip = tp;
    c.style.setProperty('--shs', (0.35 + 0.65 * p.sh).toFixed(3));   // тень растёт при приземлении — масштабом
    c.style.setProperty('--off', (-(p.sp * p.R) % (E.w * TILE_AR[p.mat])).toFixed(1) + 'px');   // печать едет с качением
    c.style.setProperty('--tile', (E.w * TILE_AR[p.mat]).toFixed(1) + 'px');
    if (c.dataset.col !== p.mat) c.dataset.col = p.mat;
    const face = c.lastChild;
    face.style.transform = `translate(-50%,-50%) rotate(${hd}deg) translateY(${(side * (E.w / 2) * (1 - p.tip)).toFixed(2)}px) scale(${(p.R / E.R0).toFixed(4)},${(kk * p.R / E.R0).toFixed(4)}) rotate(${(p.sp % (Math.PI * 2)).toFixed(4)}rad)`;
  }

  /* ═════════════ 6. ИЗМЕРЕНИЕ, ПЛАН, ЦИКЛ ═════════════ */
  function measure(sync, done) {
    const st = ST.stage; if (!st) return false;
    const drop = D.getElementById('drop'), foot = D.getElementById('footer');
    if (!drop || !foot) return false;
    const Wd = R.clientWidth, vh = innerHeight, sy = W.scrollY || 0;
    // фоновая вкладка / окно без размера: раскладки нет — план отложим до видимости или resize
    if (!(vh >= 200 && Wd >= 280) || D.hidden && !ST.built) { ST.waitLayout = true; return false; }
    ST.waitLayout = false;
    const z = sizes(Wd);
    const db = drop.getBoundingClientRect(), wrap = drop.querySelector('.wrap') || drop, wb = wrap.getBoundingClientRect(), wcs = getComputedStyle(wrap);
    const left = wb.left + parseFloat(wcs.paddingLeft || 0), right = wb.right - parseFloat(wcs.paddingRight || 0);
    const fb = foot.getBoundingClientRect();
    const H = fb.bottom + sy;
    let xL = Math.round(right + (Wd - right) / 2);
    xL = faceOut(Wd) ? Math.round(Wd - 4 - z.w / 2) : Math.min(xL, Wd - 10 - z.w / 2);   // телефон: полоса у самого края (торец наружу, кромка — под 2–3 px за экраном)
    // торец в перспективе: насколько верх рулона (высота 2R) уезжает от центра глаза
    const sl = faceOut(Wd) ? 0 : Math.ceil(z.R0 * FACE_K) + 1;   // торец-эллипс выступает за ленту на R·k (на телефоне — наружу)
    // бирка режимов в левом поле (fixed) — левее неё ленте нельзя; при ?clean=1 её нет
    const tag = D.querySelector('.mtag--full,.mtag--mini'), tagR = [...D.querySelectorAll('.mtag')].reduce((m, e) => (e.getClientRects().length && getComputedStyle(e).display !== 'none' ? Math.max(m, e.getBoundingClientRect().right) : m), 0);
    void tag;
    const bandX = z.w / 2 + Math.max(z.c, sl + 2);
    const xMin = Math.ceil(Math.max(tagR + z.c, Wd < 768 ? 4 : 8) + bandX);
    const t0 = now();
    const C = collect(Wd), t1 = now();
    const E = Object.assign({ Wd, vh, H, maxY: Math.max(0, R.scrollHeight - vh), xL, sl, xMin,
      drop: { y0: db.top + sy, y1: db.bottom + sy, padT: parseFloat(getComputedStyle(drop).paddingTop || 0), left, right },
      foot: { y0: fb.top + sy, y1: fb.bottom + sy } }, z, C);
    const pl = plan(E);
    const segs = colorize(pl.S, E), t2 = now();
    if (!segs.length) return false;
    const T = timeline(segs, pl.fin, E);
    // слой строим отдельной задачей: замер+план и сборка DOM по отдельности укладываются в бюджет кадра при CPU×4
    const go = () => {
      const t3 = now();
      ST.E = E; ST.segs = segs; ST.T = T;
      build(E, segs, T, pl.fin);
      ST.ph = [Math.round(t1 - t0), Math.round(t2 - t1), Math.round(now() - t3)];   // замер: сбор / план / слой
      ST.built = true; ST.planned++;
      ST.ms = Math.round(t2 - t0 + now() - t3);
      R.dataset.rollReady = '1';
      if (done) done();
    };
    if (sync) go(); else idle(go, 400);
    return true;
  }
  let pending = 0;
  function replan(soon) {
    clearTimeout(pending);
    pending = setTimeout(() => idle(() => { measure(false, () => kick(true)); }, 600), soon ? 30 : 220);
  }
  const STATIC = () => SHOT || RMQ.matches;
  function target() { return STATIC() ? 1e9 : (W.scrollY || 0); }
  function tick(dt) {
    if (!ST.built) return false;
    const t = target();
    if (STATIC()) ST.ys = t; else ST.ys = damp(ST.ys, t, 10, dt);
    if (Math.abs(ST.ys - t) < 0.3) ST.ys = t;
    frame(ST.ys);
    return Math.abs(ST.ys - t) > 0.3;
  }
  let loopOn = false, lastT = 0;
  function rafLoop(t) {   // запасной цикл, если GV.gl нет
    const dt = clamp((t - (lastT || t - 16.7)) / 1000, 0.001, 0.05); lastT = t;
    if (tick(dt)) requestAnimationFrame(rafLoop); else { loopOn = false; lastT = 0; }
  }
  function kick(jump) {
    if (jump) ST.ys = target();
    if (GV.gl && GV.gl.loop) { GV.gl.wake(); return; }
    if (!loopOn) { loopOn = true; requestAnimationFrame(rafLoop); }
  }

  function boot() {
    const st = D.getElementById('roll-stage');
    if (!st) return;
    ST.stage = st;
    st.setAttribute('aria-hidden', 'true');
    st.dataset.tape = TAPE;
    if (GV.gl && GV.gl.loop) GV.gl.loop(tick);
    const first = () => {
      if (ST.built || ST.starting) return;
      ST.starting = true;
      idle(() => { if (!measure(false, () => { kick(true); })) ST.starting = false; }, 900);
    };
    if (R.dataset.loader === 'done' || R.dataset.loader === 'off' || R.dataset.skip || SHOT) first();
    D.addEventListener('grinchin:ready', first, { once: true });
    setTimeout(first, 2600);
    W.addEventListener('scroll', () => kick(), { passive: true });
    D.addEventListener('visibilitychange', () => { if (D.hidden) return; if (!ST.built) first(); else if (ST.waitLayout) replan(true); });
    let lw = R.clientWidth;
    W.addEventListener('resize', () => { if (!ST.built) { first(); return; } if (R.clientWidth !== lw || ST.waitLayout) { lw = R.clientWidth; replan(); } else { ST.lastKey = ''; kick(); } }, { passive: true });
    if (W.ResizeObserver) {
      let lh = 0;
      const ro = new ResizeObserver(() => { const hgt = D.body.scrollHeight; if (ST.built && Math.abs(hgt - lh) > 1) replan(); lh = hgt; });
      ro.observe(D.body);
      // блоки, высота которых может меняться независимо (дверь T2, подписка, каталог)
      ['.ab-door', '#about', '#next', '#drop', '#looks', '#footer'].forEach((sel) => { const e = D.querySelector(sel); if (e) new ResizeObserver(() => { if (ST.built) replan(); }).observe(e); });
    }
    W.addEventListener('load', () => { if (ST.built) replan(true); });
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(() => { if (ST.built) replan(true); });
    if (RMQ.addEventListener) RMQ.addEventListener('change', () => { if (ST.built) { measure(true); kick(true); } });
  }

  GV.roll = {
    v: 31, mode: MODE, tape: TAPE,
    dbg: () => { const q = lookup(ST.T, ST.ys), h = headAt(q.s); const g = ST.segs[h.seg]; return { s: Math.round(q.s), ev: q.ev, seg: h.seg, t: g && g.t, pin: g && g.pin, ay: g && Math.round(g.a.y), by: g && Math.round(g.b.y), hx: Math.round(h.x), hy: Math.round(h.y), op: ST.roll.style.opacity, clip: ST.roll.style.clipPath }; },
    refresh: () => { measure(true); kick(true); },
    sync: () => { if (!ST.built) return false; ST.ys = target(); frame(ST.ys); return true; },   // для проверок: без сглаживания
    info: () => ({
      built: ST.built, planned: ST.planned, ms: ST.ms, ph: ST.ph, 
      w: ST.E && ST.E.w, R0: ST.E && ST.E.R0, xL: ST.E && ST.E.xL, sl: ST.E && ST.E.sl,
      segs: ST.segs.map((g) => ({ t: g.t, col: g.col, a: [Math.round(g.a.x), Math.round(g.a.y)], b: [Math.round(g.b.x), Math.round(g.b.y)], s0: Math.round(g.s0), s1: Math.round(g.s1) })),
      K: ST.T && ST.T.K.map((k) => [Math.round(k.Y), Math.round(k.s), k.ev || '', k.e == null ? '' : k.e]),
      swaps: ST.T && ST.T.swaps, L: ST.T && Math.round(ST.T.L),
      pins: ST.E && ST.E.pins.map((q) => ({ ok: q.ok, x: q.x, top: q.top, fh: Math.round(q.fh), b: [Math.round(q.bTop), Math.round(q.bBot)], loc: q.loc.map((o) => [o.k, Math.round(o.x0), Math.round(o.x1), Math.round(o.y0), Math.round(o.y1), (o.el.className || o.el.nodeName).toString().slice(0, 24)]) })),
    }),
    // для проверки пересечений: прямоугольники видимой ленты и рулона (координаты окна)
    greens: () => ST.E && ST.E.greens.map((o) => ({ y0: Math.round(o.y0), y1: Math.round(o.y1), n: (o.el.id || o.el.className || o.el.nodeName).toString().slice(0, 40) })),
    units: () => ST.E && ST.E.units.map((u) => [u.sel, Math.round(u.y0), Math.round(u.y1)]),
    obs: () => ST.E && ST.E.obs.map((o) => ({ k: o.k, x0: Math.round(o.x0), x1: Math.round(o.x1), y0: Math.round(o.y0), y1: Math.round(o.y1), n: (o.el.id || o.el.className || o.el.nodeName).toString().slice(0, 40) })),
    rects: () => {
      const out = [];
      for (const r of ST.runs) if (r.state !== -1) { const b = r.tp.getBoundingClientRect(); out.push({ k: 'tape', x0: b.left, y0: b.top, x1: b.right, y1: b.bottom }); }
      for (const x of ST.xs) if (x.on) { const b = x.e.getBoundingClientRect(); out.push({ k: 'x', x0: b.left, y0: b.top, x1: b.right, y1: b.bottom }); }
      for (const x of ST.sts) if (x.on) { const b = x.e.getBoundingClientRect(), i = Math.min(b.width, b.height) * 0.12; out.push({ k: 'st', x0: b.left + i, y0: b.top + i, x1: b.right - i, y1: b.bottom - i }); }   // у стикера углы прозрачные
      if (ST.roll && +ST.roll.style.opacity > 0.05) {
        const b = ST.roll.getBoundingClientRect(), E = ST.E, h = headAt(lookup(ST.T, ST.ys).s);
        // фактический след рулона: вдоль курса 2R, поперёк w + торец в перспективе
        const sc = ST.lastScale || 1, along = (ST.lastR || E.R0) * sc, across = (E.w / 2 + (Math.abs(Math.sin(h.hd)) < 0.5 ? Math.ceil(E.R0 * FACE_K) + 1 : E.sl)) * sc;   // текущий радиус и масштаб приземления
        const cx = (b.left + b.right) / 2, cy = (b.top + b.bottom) / 2, co = Math.abs(Math.cos(h.hd)), si = Math.abs(Math.sin(h.hd));
        const hx = along * co + across * si, hy = along * si + across * co;   // описанный прямоугольник повёрнутого следа
        const q = { k: 'roll', x0: cx - hx, x1: cx + hx, y0: cy - hy, y1: cy + hy };
        const m = /inset\(([\d.]+)px 0(?:px)? ([\d.]+)px/.exec(ST.roll.style.clipPath || '') || /inset\(0(?:px)? 0(?:px)? ([\d.]+)px/.exec(ST.roll.style.clipPath || '');
        if (m && m.length === 3) { q.y0 = Math.max(q.y0, b.top + +m[1]); q.y1 = Math.min(q.y1, b.bottom - +m[2]); }   // срез по устью туннеля
        else if (m) q.y1 = Math.min(q.y1, b.bottom - +m[1]);
        if (q.y1 > q.y0) out.push(q);
      }
      return out;
    },
  };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
