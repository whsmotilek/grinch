/* GRINCHIN v5 · T1 · Блок скотча «IGNORE THE SIGNS» (#tape) → window.GV.tapeblock
   Сцена: мультяшный рулон катится и раскатывает лайм-ленту со слоганом, по пути заклеивает (знак вздрагивает под лентой)
   и сбивает (знак отрывается и улетает) дорожные знаки; в конце — обрыв (рваный конец), лента «прихлопывается» с качанием,
   чёрная лента ложится крест-накрест, как на упаковке. Счётчик «проигнорировано знаков» тикает по ходу.
   Варианты (?tape=a|b, по умолчанию — DEF):
     a — «прямо»: desktop — лента поперёк экрана, рулон доезжает и встаёт с покачиванием, короткий чёрный кусок крестом на STOP;
         телефон — лента вертикально, рулон катится вниз и после обрыва падает из кадра.
     b — «диагональ сверху вниз»: лента с левого верха в правый низ, рулон разгоняется под уклон, после обрыва улетает;
         чёрная лента раскатывается по второй диагонали — крест на весь экран, STOP в перекрестье.
   Физика: угол = путь/радиус, рулон худеет: R² = rc² + (R0² − rc²)(1 − s/Lc) → угол = 2(R0 − R)/B (замкнутая формула).
   Крупное движение (рулон, раскрытие, полёт сбитого знака, подпись) — функция прогресса прокрутки (обратимо);
   «удары» (вздрагивание знаков, шлепок ленты, покачивание рулона, толчок кадра) — пружины во времени, запускаются при
   пересечении порога вперёд. Прогресс прокрутки сглажен (инерция ~0,1 с) — сцена дотягивает после остановки пальца.
   Рендер: только transform/opacity, свой rAF только пока блок в кадре и что-то движется.
   Статика (reduced-motion, ?shot=1): финальная композиция, ничего не движется. Отладка: ?tbp=0..1 — заморозить прогресс. */
(() => {
  'use strict';
  const GV = (window.GV = window.GV || {});
  if (GV.tapeblock) return;
  const D = document, R = D.documentElement, W = window;
  const DEF = 'b';
  const sec = D.getElementById('tape');
  if (!sec) return;
  const stage = sec.querySelector('.tb-stage'), world = sec.querySelector('.tb-world');
  const capEl = sec.querySelector('.tb-copy .tb-cap'), nEl = sec.querySelector('[data-tb-n]'), totEl = sec.querySelector('[data-tb-total]');
  let Q; try { Q = new URLSearchParams(location.search); } catch (e) { Q = { get: () => null, has: () => false }; }
  const qv = Q.get('tape');
  const VAR = qv === 'a' || qv === 'b' ? qv : DEF;
  sec.dataset.tb = VAR;
  const RMQ = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const isStatic = () => R.dataset.shot === '1' || RMQ.matches;
  const FORCE = Q.has('tbp') ? Math.min(1, Math.max(0, parseFloat(Q.get('tbp')) || 0)) : null;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lin = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
  const eOut = (t, k) => 1 - Math.pow(1 - t, k || 2);
  const eIO = (t) => t * t * (3 - 2 * t);
  const DEG = 180 / Math.PI;
  const f1 = (v) => Math.round(v * 10) / 10, f3 = (v) => Math.round(v * 1000) / 1000;
  const mk = (tag, cls, par) => { const e = D.createElement(tag); if (cls) e.className = cls; if (par) par.appendChild(e); return e; };
  const tf = (e, v) => { if (e._t !== v) { e._t = v; e.style.transform = v; } };
  const op = (e, v) => { v = f3(v); if (e._o !== v) { e._o = v; e.style.opacity = v; } };

  /* ═════════════ 1. ГРАФИКА ═════════════ */
  // знаки — монохром (единственный зелёный объект сцены — лента с рулоном), стиль стикеров: белая вырубка, жирный контур
  const PAPER = '#F4F3F3', INK = '#0b0b0b';
  const oct = (r) => { let p = ''; for (let i = 0; i < 8; i++) { const a = (Math.PI / 8) + i * Math.PI / 4; p += (i ? 'L' : 'M') + f1(100 + r * Math.cos(a)) + ' ' + f1(100 + r * Math.sin(a)); } return p + 'Z'; };
  const gloss = '<path d="M46 66 Q58 42 84 34" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".85"/><path d="M42 82 l-1 7" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".85"/>';
  const SIGN = {
    stop: `<path d="${oct(104)}" fill="#fff" stroke="#000" stroke-width="3" stroke-linejoin="round"/><path d="${oct(90)}" fill="${INK}" stroke="#000" stroke-width="6" stroke-linejoin="round"/><path d="${oct(78)}" fill="none" stroke="${PAPER}" stroke-width="4" stroke-linejoin="round"/><text x="100" y="117" text-anchor="middle" font-family="Unbounded,Arial Black,sans-serif" font-weight="900" font-size="47" fill="${PAPER}" letter-spacing="-1">STOP</text>${gloss}`,
    noentry: `<circle cx="100" cy="100" r="99" fill="#fff" stroke="#000" stroke-width="3"/><circle cx="100" cy="100" r="86" fill="${INK}" stroke="#000" stroke-width="5"/><circle cx="100" cy="100" r="74" fill="none" stroke="${PAPER}" stroke-width="4"/><rect x="44" y="85" width="112" height="30" rx="6" fill="${PAPER}"/>${gloss}`,
    turn: `<rect x="2" y="2" width="196" height="196" rx="36" fill="#fff" stroke="#000" stroke-width="3"/><rect x="15" y="15" width="170" height="170" rx="26" fill="${PAPER}" stroke="#000" stroke-width="8"/><path d="M68 158 V112 Q68 76 104 76 H120" fill="none" stroke="${INK}" stroke-width="24" stroke-linecap="round"/><path d="M114 46 L156 76 L114 106 Z" fill="${INK}" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>`,
    warn: `<path d="M100 6 L196 178 Q199 192 184 192 H16 Q1 192 4 178 Z" fill="#fff" stroke="#000" stroke-width="3" stroke-linejoin="round"/><path d="M100 26 L180 174 H20 Z" fill="${PAPER}" stroke="${INK}" stroke-width="16" stroke-linejoin="round"/><rect x="91" y="78" width="18" height="52" rx="7" fill="${INK}"/><circle cx="100" cy="150" r="10" fill="${INK}"/>`,
    speed: `<circle cx="100" cy="100" r="99" fill="#fff" stroke="#000" stroke-width="3"/><circle cx="100" cy="100" r="84" fill="${PAPER}" stroke="${INK}" stroke-width="20"/><text x="100" y="124" text-anchor="middle" font-family="Unbounded,Arial Black,sans-serif" font-weight="900" font-size="64" fill="${INK}" letter-spacing="-3">40</text>`
  };
  const svg = (inner, vb) => `<svg viewBox="${vb || '0 0 200 200'}" xmlns="http://www.w3.org/2000/svg" focusable="false">${inner}</svg>`;

  // рулон: единицы — R0 = 100. Слои: «под» (тень + бок + контур, масштаб s), «вращение» {торец-намотка (масштаб s), шпуля},
  // «стенка» (внутренность шпули, не вращается), «блик» (масштаб s, не вращается — свет стоит на месте)
  const RC = 56, RI = 34;   // шпуля: наружный / внутренний радиус
  const ring = (cx, cy, ro, ri) => `M${cx - ro} ${cy}a${ro} ${ro} 0 1 0 ${2 * ro} 0a${ro} ${ro} 0 1 0 ${-2 * ro} 0Z M${cx - ri} ${cy}a${ri} ${ri} 0 1 0 ${2 * ri} 0a${ri} ${ri} 0 1 0 ${-2 * ri} 0Z`;
  const arc = (r, a0, a1) => { const p = (a) => f1(r * Math.cos(a / DEG)) + ' ' + f1(r * Math.sin(a / DEG)); return `M${p(a0)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p(a1)}`; };
  const VB = '-115 -115 230 230';
  const ROLL = {
    under: `<path fill-rule="evenodd" d="${ring(19, 23, 106, 74)}" fill="#000" opacity=".5"/><path fill-rule="evenodd" d="${ring(10, 12, 107, 74)}" fill="#000"/><path fill-rule="evenodd" d="${ring(10, 12, 100, 74)}" fill="#5B8A00"/><path d="${arc(97, -20, 110).replace('M', 'M').trim()}" transform="translate(10 12)" fill="none" stroke="#3E6000" stroke-width="5"/><path fill-rule="evenodd" d="${ring(0, 0, 107, 62)}" fill="#000"/>`,
    face: `<path fill-rule="evenodd" d="${ring(0, 0, 100, 60)}" fill="#8ED308"/><path fill-rule="evenodd" d="${ring(0, 0, 100, 94)}" fill="#7DBE04"/><path fill-rule="evenodd" d="${ring(0, 0, 66, 60)}" fill="#6DA108"/>` +
      [89, 80, 71, 64].map((r) => `<circle r="${r}" fill="none" stroke="#6DA108" stroke-width="1.6"/>`).join('') +
      `<path d="${arc(84, 20, 75)}" fill="none" stroke="#4F7A00" stroke-width="3" stroke-linecap="round"/><path d="${arc(75, 150, 186)}" fill="none" stroke="#4F7A00" stroke-width="3" stroke-linecap="round"/><path d="${arc(93, 248, 268)}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>` +
      `<path d="M${f1(93 * Math.cos(1.1))} ${f1(93 * Math.sin(1.1))} L${f1(101 * Math.cos(1.1))} ${f1(101 * Math.sin(1.1))}" stroke="#000" stroke-width="4" stroke-linecap="round"/>`,
    core: `<path fill-rule="evenodd" d="${ring(0, 0, RC, RI)}" fill="#D3C9B4" stroke="#000" stroke-width="4"/><defs><path id="tb-corep" d="${arc(45, -90, 269.9)}"/></defs><text font-family="Unbounded,Arial Black,sans-serif" font-weight="800" font-size="10.5" fill="#1a1a1a" letter-spacing="1.2"><textPath href="#tb-corep" xlink:href="#tb-corep">GRINCHIN ✶ GRINCHIN ✶ GRINCHIN ✶</textPath></text>`,
    wall: `<defs><mask id="tb-wallm"><circle r="${RI - 2}" fill="#fff"/><circle cx="8" cy="10" r="${RI - 2}" fill="#000"/></mask></defs><rect x="-40" y="-40" width="80" height="80" fill="#7A715F" mask="url(#tb-wallm)"/>`,
    gloss: `<path d="${arc(88, 198, 246)}" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/><path d="${arc(88, 254, 266)}" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/><path d="M-58 -46 l3 -11 l3 11 l11 3 l-11 3 l-3 11 l-3 -11 l-11 -3Z" fill="#fff"/>`
  };

  /* ═════════════ 2. КОМПОЗИЦИИ ═════════════ */
  // Линия ленты: через точки A (вход в экран) и B; s — путь по линии от p0 (за краем экрана на R0+80). Знаки: t — доля пути
  // от A до точки обрыва (у лайма) / до B (у чёрной), off — смещение поперёк ленты в её ширинах, sz — размер в ширинах.
  function compose(w, h) {
    const mob = w < 768;
    const k = VAR + (mob ? 'm' : 'd');
    let c;
    if (k === 'ad') {
      const th = clamp(w * 0.088, 96, 150);
      c = { lay: 'da', th, R0: th * 1.2, side: 1, end: 'stop', A: [0, h * 0.55], B: [w, h * 0.55], tear: 0.76,
        signs: [
          { k: 'noentry', t: 0.13, off: -0.42, sz: 2.0, rot: -8, act: 'tape' },
          { k: 'turn', t: 0.34, off: -0.1, sz: 1.7, rot: 7, act: 'knock', kick: [1.15, -1.6, 0.55, 46] },
          { k: 'warn', t: 0.55, off: 0.38, sz: 2.0, rot: -5, act: 'tape' },
          { k: 'stop', t: 0.82, off: -0.78, sz: 2.35, rot: 6, act: 'cross' }],
        piece: { ang: -58, len: 2.9, th: 0.8 } };
    } else if (k === 'am') {
      const th = clamp(w * 0.21, 72, 96);
      c = { lay: 'ma', th, R0: th * 1.0, side: -1, end: 'fly', A: [w * 0.63, 0], B: [w * 0.63, h], tear: 0.80,
        signs: [
          { k: 'noentry', t: 0.10, off: -0.12, sz: 1.45, rot: -7, act: 'tape' },
          { k: 'warn', t: 0.30, off: 0.3, sz: 1.3, rot: -9, act: 'tape' },
          { k: 'turn', t: 0.50, off: 0.10, sz: 1.35, rot: 8, act: 'knock', kick: [1.1, 0.7, 0.5, -40] },
          { k: 'stop', t: 0.73, off: 0.95, sz: 1.85, rot: -5, act: 'cross' }],
        piece: { ang: -35, len: 2.7, th: 0.8, line: 0 } };
    } else if (k === 'bd') {
      const th = clamp(w * 0.085, 92, 146);
      c = { lay: 'db', th, R0: th * 1.15, side: 1, end: 'fly', A: [0, h * 0.10], B: [w, h * 0.90], tear: 0.90, cross: 0.5,
        signs: [
          { k: 'noentry', t: 0.20, off: -0.10, sz: 1.6, rot: -8, act: 'tape' },
          { k: 'turn', t: 0.36, off: 0.0, sz: 1.45, rot: 7, act: 'knock', kick: [1.0, -1.7, 0.55, 50] },
          { k: 'stop', t: 'xtop', up: 1.15, sz: 2.3, rot: 5, act: 'cross' },
          { k: 'warn', t: 0.80, off: 0.12, sz: 1.65, rot: -6, act: 'tape' },
          { k: 'speed', t: 0.22, on: 'black', off: 0.05, sz: 1.5, rot: 9, act: 'tape' }] };
    } else {   // bm
      const th = clamp(w * 0.205, 70, 92);
      c = { lay: 'mb', th, R0: th * 0.95, side: 1, end: 'fly', A: [0, h * 0.31], B: [w, h * 0.73], tear: 0.95, cross: 0.84, txtStart: 0.3,
        signs: [
          { k: 'noentry', t: 0.14, off: 0.05, sz: 1.35, rot: -8, act: 'tape' },
          { k: 'turn', t: 0.40, off: -0.05, sz: 1.2, rot: 8, act: 'knock', kick: [0.9, -1.5, 0.5, 46] },
          { k: 'stop', t: 'xtop', up: 1.5, dx: -0.45, sz: 1.8, rot: 5, act: 'cross' },
          { k: 'warn', t: 0.5, on: 'black', off: -0.55, sz: 1.35, rot: -8, act: 'tape' }] };
    }
    // вторая диагональ — зеркальный наклон через точку перекрестья на лайме (доля cross пути A→B)
    if (c.cross != null) {
      const X = [c.A[0] + (c.B[0] - c.A[0]) * c.cross, c.A[1] + (c.B[1] - c.A[1]) * c.cross], tg = (c.B[1] - c.A[1]) / (c.B[0] - c.A[0]);
      c.C = [w, X[1] - (w - X[0]) * tg]; c.Dp = [0, X[1] + X[0] * tg]; c.X = X;
    }
    c.w = w; c.h = h; c.mob = mob;
    const line = (A, B, extra) => {
      const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy), cs = dx / L, sn = dy / L;
      const pre = extra;   // старт за краем экрана
      return { x0: A[0] - cs * pre, y0: A[1] - sn * pre, cs, sn, ang: Math.atan2(sn, cs) * DEG, sA: pre, LAB: L,
        flip: cs < -1e-6, at(s, o) { return [this.x0 + this.cs * s - this.sn * o, this.y0 + this.sn * s + this.cs * o]; } };
    };
    c.L = line(c.A, c.B, c.R0 + 90);
    c.L.sT = c.L.sA + c.tear * c.L.LAB;
    c.L.len = c.L.sT;
    if (c.C) {
      c.K = line(c.C, c.Dp, c.th * 1.2);
      c.K.len = c.K.sA + c.K.LAB + c.th * 1.2;
      // перекрестье — точка пересечения линий (там STOP)
      const L = c.L, K = c.K, den = L.cs * K.sn - L.sn * K.cs;
      const tx = ((K.x0 - L.x0) * K.sn - (K.y0 - L.y0) * K.cs) / den;
      c.xs = tx;
      c.xk = ((K.x0 - L.x0) * L.sn - (K.y0 - L.y0) * L.cs) / den;
    }
    c.rc = c.R0 * RC / 100;
    c.Rend = c.R0 * 0.74;
    // ёмкость рулона: к обрыву радиус ровно Rend
    const q = (c.Rend * c.Rend - c.rc * c.rc) / (c.R0 * c.R0 - c.rc * c.rc);
    c.Lc = (c.L.sT) / (1 - q);
    c.Bk = (c.R0 * c.R0 - c.rc * c.rc) / c.Lc;
    // знаки → координаты
    c.signs.forEach((g) => {
      const on = g.on === 'black' ? c.K : c.L;
      g.line = on;
      g.px = g.sz * c.th;
      if (g.t === 'xtop') { g.x = c.X[0] + (g.dx || 0) * c.th; g.y = c.X[1] - g.up * c.th; }   // над перекрестьем: буквы видны, низ знака под крестом
      else {
        g.s = on.sA + g.t * (on === c.L ? c.L.sT - c.L.sA : c.K.LAB);
        [g.x, g.y] = on.at(g.s, (g.off || 0) * c.th);
      }
      // какие ленты реально ложатся на знак: проекция центра на линию и расстояние до неё
      const pr = (Ln) => { const dx = g.x - Ln.x0, dy = g.y - Ln.y0; return [dx * Ln.cs + dy * Ln.sn, Math.abs(-dx * Ln.sn + dy * Ln.cs)]; };
      [g.sL, g.dL] = pr(c.L); g.tL = g.dL < g.px * 0.42 + c.th * 0.5 && g.sL < c.L.sT + g.px * 0.3;
      if (c.K) { [g.sK, g.dK] = pr(c.K); g.tK = g.dK < g.px * 0.42 + c.th * 0.5; }
    });
    // где должна кончиться целая фраза на лайме: (a) у обрыва; (b) перед перекрестьем — до чёрной ленты
    c.L.txtEnd = c.K ? c.xs - c.th * 0.85 : c.L.sT - c.th * 0.32;
    if (c.txtStart != null) c.L.txtAt = c.L.sA + c.txtStart * c.th;   // телефон b: фраза целиком от края экрана
    // тайминг (доли прогресса)
    c.P = c.end === 'stop'
      ? { r0: 0.03, tear: 0.70, rest: 0.79, slap: 0.73, blk: 0.83, cap: [0.86, 0.95] }
      : { r0: 0.03, tear: 0.62, fly: 0.74, slap: 0.65, kRev: [0.70, 0.83], blk: c.K ? 0.835 : 0.76, cap: [0.86, 0.95] };
    if (!c.K && c.end === 'fly') c.P.blk = 0.77;
    return c;
  }

  /* ═════════════ 3. СБОРКА DOM ═════════════ */
  let C = null, E = null;
  function tapeDom(col, cls) {
    const run = mk('div', 'tb-a tb-run tb-run--' + col + (cls ? ' ' + cls : ''), world);
    const win = mk('div', 'tb-win', run);
    const shd = mk('i', 'tb-shd', win);
    const strip = mk('div', 'tb-strip', win);
    const face = mk('div', 'tb-face', strip);
    const txt = mk('div', 'tb-txt', face);
    return { run, win, shd, strip, face, txt };
  }
  function fillText(T, phrase, len, center) {
    let html = '';
    if (center) html = `<span>${phrase}</span>`;
    else { const n = Math.ceil(len / (T.ph || C.th * 1.6)) + 2; for (let i = 0; i < n; i++) html += `<span>${phrase}</span><i></i>`; }
    T.txt.innerHTML = html;
  }
  function build() {
    world.textContent = '';
    const c = C, e = {};
    e.signs = c.signs.map((g) => {
      // сбиваемый знак — поверх лент (он не заклеивается, а летит к зрителю); остальные — под лентами
      const el = mk('div', 'tb-a tb-sign tb-sign--' + g.k, g.act === 'knock' ? null : world);
      el.style.setProperty('--sz', f1(g.px) + 'px');
      el.innerHTML = svg(SIGN[g.k]);
      return { g, el, shake: -1e9, done: 0, dir: 0 };
    });
    // лайм
    e.L = tapeDom('lime');
    e.L.endR = mk('i', 'tb-end', e.L.run);
    fillText(e.L, 'IGNORE THE SIGNS', c.L.len);
    // чёрная: длинная по второй диагонали (b) или короткий кусок крестом на STOP (a)
    if (c.K) {
      e.K = tapeDom('black');
      e.K.lead = mk('i', 'tb-end', e.K.run);
      if (c.K.flip) e.K.run.classList.add('tb-flip');
      fillText(e.K, 'GRINCHIN', c.K.len);
    } else {
      e.K = tapeDom('black', 'tb-run--piece');
      e.K.endL = mk('i', 'tb-end tb-end--l', e.K.run);
      e.K.endR = mk('i', 'tb-end', e.K.run);
    }
    e.signs.forEach((S) => { if (!S.el.parentNode) world.appendChild(S.el); });
    // рулон (поверх лент)
    const roll = mk('div', 'tb-a tb-roll', world);
    // слой — div с SVG внутри: трансформируем div (у корневого <svg> Safari берёт transform-origin 0 0)
    const layer = (inner, par) => { const d = mk('div', 'tb-rl', par); d.innerHTML = svg(inner, VB); return d; };
    e.rUnder = layer(ROLL.under, roll);
    e.spin = mk('div', 'tb-spin', roll);
    e.rFace = layer(ROLL.face, e.spin);
    e.rCore = layer(ROLL.core, e.spin);
    e.rWall = layer(ROLL.wall, roll);
    e.rGloss = layer(ROLL.gloss, roll);
    e.roll = roll;
    E = e;
    if (totEl) totEl.textContent = c.signs.length;
  }

  /* ═════════════ 4. РАСКЛАДКА ═════════════ */
  let travel = 1, vh = 1, stH = 1;
  function layout() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    vh = W.innerHeight; stH = h;
    travel = Math.max(1, sec.offsetHeight - h);
    const prevK = C && (C.w + 'x' + C.h);
    if (prevK === w + 'x' + h && E) return;
    C = compose(w, h);
    sec.dataset.tbLay = C.lay;
    sec.style.setProperty('--th', f1(C.th) + 'px');
    build();
    const c = C, e = E;
    // лайм-лента: кадр в точке старта, повёрнут вдоль линии
    const setRun = (T, Ln) => {
      T.run.style.setProperty('--len', f1(Ln.len) + 'px');
      T.base = `translate(${f1(Ln.x0)}px,${f1(Ln.y0)}px) rotate(${f3(Ln.ang)}deg)`;
      tf(T.run, T.base);
    };
    setRun(e.L, c.L);
    tf(e.L.endR, `translate(${f1(c.L.sT - 1)}px,0)`);
    if (c.K) {
      setRun(e.K, c.K);
    } else {
      const st = c.signs.find((g) => g.k === 'stop'), p = c.piece, len = p.len * c.th, tb = p.th * c.th;
      e.K.run.style.setProperty('--len', f1(len) + 'px');
      e.K.run.style.setProperty('--th', f1(tb) + 'px');
      [e.K.cx, e.K.cy] = p.line != null ? c.L.at(st.sL, p.line * c.th) : [st.x, st.y];   // по центру знака или на лайме напротив него
      e.K.ang = p.ang; e.K.len = len;
      // где кусок пересекает лайм: туда ставим звёздочку-разделитель печати — крест не съедает слово слогана
      const pc = Math.cos(p.ang / DEG), ps = Math.sin(p.ang / DEG), Ln = c.L, den = Ln.cs * ps - Ln.sn * pc;
      c.L.sepAt = Math.abs(den) < 1e-6 ? st.sL : ((e.K.cx - Ln.x0) * ps - (e.K.cy - Ln.y0) * pc) / den;
      tf(e.K.endL, `translate(${f1(-tb * 0.47 + 1)}px,0) scaleX(-1)`);
      tf(e.K.endR, `translate(${f1(len - 1)}px,0)`);
      fillText(e.K, 'GRINCHIN', len, true);
      tf(e.K.win, 'none'); tf(e.K.strip, 'none');
    }
    // рулон: размер слоёв
    e.roll.style.setProperty('--rs', f1(c.R0 * 2.3) + 'px');
    measureText();
    sec.classList.add('is-ready');
    last = -1; render(cur, true);
  }
  // печать: фраза кончается ровно перед обрывом (слово не режется рваным краем), первая целая фраза — в кадре
  function measureText() {
    const T = E.L, sp = T.txt.children;
    if (sp.length < 3) return;
    const per = sp[2].offsetLeft - sp[0].offsetLeft, pw = sp[0].offsetWidth;
    if (!per || !pw) return;
    T.ph = per;
    // начало фразы: (a) звёздочка — на пересечении с чёрным куском; (b, телефон) от края экрана; (b) фраза кончается перед перекрестьем
    const want = C.L.sepAt != null ? C.L.sepAt - (per - pw) / 2 - pw : C.L.txtAt != null ? C.L.txtAt : C.L.txtEnd - pw;
    let off = want % per; if (off > 0) off -= per;
    T.txt.style.transform = `translateX(${f1(off)}px)`;
    if (E.K && C.K) { const s2 = E.K.txt.children; if (s2.length > 2) E.K.ph = s2[2].offsetLeft - s2[0].offsetLeft; }
  }

  /* ═════════════ 5. КАДР ═════════════ */
  let cur = 0, target = 0, last = -1, raf = 0, prevT = 0, inView = false;
  const ev = { slap: -1e9, slapOn: 0, blk: -1e9, blkOn: 0, kslap: -1e9, kslapOn: 0, rest: -1e9, restOn: 0, tear: -1e9, tearOn: 0, bump: 0 };
  let STILL = false;
  let busyUntil = 0;
  const now = () => (W.performance ? performance.now() : Date.now());
  const radius = (s) => Math.sqrt(Math.max(C.rc * C.rc, C.R0 * C.R0 - C.Bk * Math.min(s, C.L.sT)));
  const spinAt = (s) => {   // угол качения, градусы
    const sl = Math.min(s, C.L.sT);
    let a = 2 * (C.R0 - radius(sl)) / C.Bk;
    if (s > C.L.sT) a += (s - C.L.sT) / C.Rend;
    return a * DEG * C.side;
  };
  // затухающая пружина: амплитуда 1 → 0 за ~dur
  const spring = (age, f, dur) => (age < 0 || age > dur * 1.6 ? 0 : Math.exp(-age / (dur * 0.32)) * Math.sin(age / 1000 * Math.PI * 2 * f) * (1 - age / (dur * 1.6)));
  function trig(key, on, t) {
    if (on && !ev[key + 'On']) { ev[key + 'On'] = 1; ev[key] = STILL ? -1e9 : t; if (!STILL) busyUntil = Math.max(busyUntil, t + 900); return true; }
    if (!on && ev[key + 'On']) { ev[key + 'On'] = 0; ev[key] = -1e9; }
    return false;
  }

  function render(p, still) {
    if (!C || !E) return;
    STILL = !!still;
    const c = C, e = E, P = c.P, Ln = c.L, t = still ? 1e12 : now();
    const age = (k) => (still ? 1e9 : t - ev[k]);
    // — рулон: путь по линии —
    const sTear = Ln.sT;
    let s, rx, ry, Rr, rot, rOp = 1;
    const uRoll = lin(P.r0, P.tear, p);
    if (c.end === 'stop') {
      s = sTear * (uRoll * (1.32 - 0.32 * uRoll));   // въезжает с ходу, к обрыву чуть сбавляет
      if (p > P.tear) s = sTear + c.Rend * 1.15 * eOut(lin(P.tear, P.rest, p), 2.4);
    } else {
      s = sTear * (0.42 * uRoll + 0.58 * uRoll * uRoll);   // под уклон — разгон
    }
    Rr = radius(s);
    const yo = -c.side * (Rr - c.th * 0.5);
    [rx, ry] = Ln.at(Math.min(s, sTear + (c.end === 'stop' ? 1e9 : 0)), yo);
    rot = spinAt(s);
    if (c.end === 'fly' && p > P.tear) {   // обрыв → полёт: скорость вдоль ленты + тяжесть вниз
      const u = (p - P.tear) / (P.fly - P.tear);
      const v = sTear * 1.58 / (P.tear - P.r0) * (P.fly - P.tear);   // px за отрезок полёта
      const g = c.h * 1.5;
      rx += Ln.cs * v * u; ry += Ln.sn * v * u + 0.5 * g * u * u - c.th * 0.5 * u;
      rot += (v * u / c.Rend) * DEG * c.side * 0.9;
      rOp = 1 - lin(0.85, 1, u);
    }
    // покачивание вставшего рулона (а): пружина по времени
    trig('rest', c.end === 'stop' && p >= P.rest - 0.005, t);
    let rock = 0;
    if (c.end === 'stop') { rock = spring(age('rest'), 1.6, 900); rot += rock * 9 * c.side; rx -= Ln.cs * rock * c.Rend * 9 / DEG; ry -= Ln.sn * rock * c.Rend * 9 / DEG; }
    const sc = Rr / c.R0;
    tf(e.roll, `translate(${f1(rx)}px,${f1(ry)}px)`);
    op(e.roll, rOp);
    tf(e.rUnder, `scale(${f3(sc)})`);
    tf(e.rFace, `scale(${f3(sc)})`);
    tf(e.rGloss, `scale(${f3(sc)})`);
    tf(e.spin, `rotate(${f1(rot)}deg)`);
    // — лайм: раскрытие до точки касания —
    const r = clamp(s + c.R0 * RI / 100 * 0.95, 0, sTear), Lw = Ln.len;
    tf(e.L.win, `translate(${f1(r - Lw)}px,0)`);
    tf(e.L.strip, `translate(${f1(Lw - r)}px,0)`);
    // обрыв: рваный конец показывается, когда рулон ушёл с него; щелчок — короткая пружина
    const torn = c.end === 'stop' ? s > sTear + 2 : p > P.tear + 0.004;
    trig('tear', torn, t);
    const sn = spring(age('tear'), 7, 380);
    op(e.L.endR, torn ? 1 : 0);
    tf(e.L.endR, `translate(${f1(sTear - 1 - sn * 5)}px,0) scaleX(${f3(1 + sn * 0.25)})`);
    // шлепок: до него лента «не прижата» (тень дальше), после — прижата, всё качнулось
    trig('slap', p >= P.slap, t);
    const sl = spring(age('slap'), 2.4, 700);
    const pressed = ev.slapOn ? 1 - Math.exp(-age('slap') / 90) : 0;
    tf(e.L.shd, `translate(${f1(Lw - r)}px,${f1(7 - 5 * pressed)}px)`);
    const piv = Math.min(r, sTear) * 0.5 + Ln.sA * 0.5;   // ось качания — середина видимой ленты
    if (sl) tf(e.L.run, `${e.L.base} translate(${f1(piv)}px,0) rotate(${f3(sl * 0.9)}deg) scale(${f3(1 + Math.abs(sl) * 0.012)}) translate(${f1(-piv)}px,0)`);
    else tf(e.L.run, e.L.base);
    // — чёрная —
    let kr = 0;
    if (c.K) {
      kr = c.K.len * eIO(lin(P.kRev[0], P.kRev[1], p));
      const Kw = c.K.len;
      tf(e.K.win, `translate(${f1(kr - Kw)}px,0)`);
      tf(e.K.strip, `translate(${f1(Kw - kr)}px,0)`);
      trig('kslap', p >= P.blk, t);
      const kp = ev.kslapOn ? 1 - Math.exp(-age('kslap') / 90) : 0;
      tf(e.K.shd, `translate(${f1(Kw - kr)}px,${f1(9 - 7 * kp)}px)`);
      op(e.K.run, kr > 1 ? 1 : 0);
      tf(e.K.lead, `translate(${f1(kr - 1)}px,0)${c.K.flip ? ' scaleY(-1)' : ''}`);
      op(e.K.lead, kr > 1 && kr < Kw - 2 ? 1 : 0);
      const ks = spring(age('kslap'), 2.6, 650);
      const kpiv = c.xk;
      if (ks) tf(e.K.run, `${e.K.base} translate(${f1(kpiv)}px,0) rotate(${f3(ks * 0.8)}deg) translate(${f1(-kpiv)}px,0)`);
      else tf(e.K.run, e.K.base);
    } else {
      // кусок крестом: влетает, бьёт (overshoot), прижимается
      const on = p >= P.blk;
      trig('blk', on, t);
      const a = age('blk'), u = on ? clamp(a / 420, 0, 1) : 0;
      const hit = 0.5;
      let k, rr, o, sh;
      if (!on) { k = 1.5; rr = -16; o = 0; sh = 22; }
      else if (u < hit) { const v = u / hit; k = 1.5 - 0.56 * v * v; rr = -16 * (1 - v * v); o = Math.min(1, v * 3); sh = 22 - 19 * v * v; }
      else { const v = (u - hit) / (1 - hit); k = 0.94 + 0.06 * eOut(v, 3) + spring(a - 210, 3.2, 500) * 0.035; rr = spring(a - 210, 2.8, 520) * 3; o = 1; sh = 3; }
      tf(e.K.run, `translate(${f1(e.K.cx)}px,${f1(e.K.cy)}px) rotate(${f3(e.K.ang + rr)}deg) scale(${f3(k)}) translate(${f1(-e.K.len / 2)}px,0)`);
      op(e.K.run, o);
      tf(e.K.shd, `translate(0,${f1(sh)}px)`);
      if (on && a >= 210 && !ev.bump) { ev.bump = still ? -1e9 : t; if (!still) busyUntil = Math.max(busyUntil, t + 700); }
      if (!on) ev.bump = 0;
    }
    // — знаки —
    let n = 0;
    for (const S of e.signs) {
      const g = S.g;
      let x = g.x, y = g.y, rr = g.rot, k = 1, o = 1;
      if (g.act === 'knock') {
        const sHit = g.s - g.px * 0.5 - Rr * 0.75;
        const d = (Math.min(s, sTear) - sHit) / c.th;
        if (d > 0) {
          const kk = g.kick, lift = Math.min(1, d / 0.35);
          x += kk[0] * d * c.th; y += kk[1] * d * c.th + kk[2] * d * d * c.th;
          rr += kk[3] * d; k = 1 + 0.1 * lift;
          o = 1 - lin(2.6, 3.6, d);
          if (d > 0.3) n++;
        }
        // удар рулона — короткое вздрагивание перед отрывом
        const near = (s - (sHit - c.th * 0.5)) / c.th;
        if (near > 0 && near < 0.5) rr += Math.sin(near * Math.PI * 6) * 3 * (1 - near * 2);
      } else {
        const taped = (g.tL && r >= g.sL - g.px * 0.3) || (g.tK && kr >= g.sK - g.px * 0.3) || (!c.K && g.k === 'stop' && ev.blkOn);
        if (taped && !S.done) { S.done = 1; S.shake = still ? -1e9 : t; if (!still) busyUntil = Math.max(busyUntil, t + 800); }
        if (!taped && S.done) S.done = 0;
        if (taped) n++;
        let sh = spring(still ? 1e9 : t - S.shake, 9, 520);
        // шлепки лент и удар чёрного куска — вздрагивают все заклеенные
        if (S.done) sh += spring(age('slap'), 8, 420) * 0.6;
        if (g.k === 'stop') { sh += spring(still || !ev.bump ? 1e9 : t - ev.bump, 10, 520) * 1.2; sh += spring(age('kslap'), 9, 480); }
        rr += sh * 4.5; k = 1 - Math.abs(sh) * 0.03;
      }
      tf(S.el, `translate(${f1(x)}px,${f1(y)}px) rotate(${f1(rr)}deg) scale(${f3(k)})`);
      op(S.el, o);
    }
    if (nEl && nEl._n !== n) { nEl._n = n; nEl.textContent = n; }
    // — подпись к финалу —
    if (capEl) { const u = eOut(lin(P.cap[0], P.cap[1], p), 3); op(capEl, u); tf(capEl, `translate(0,${f1((1 - u) * 18)}px)`); }
    // — «камера»: медленный наезд всё время хода + толчок при ударе чёрного куска —
    const bump = C.K ? spring(age('kslap'), 6, 300) : spring(still || !ev.bump ? 1e9 : t - ev.bump, 6, 300);
    tf(world, `scale(${f3(1 + 0.03 * p)}) translate(0,${f1(-6 * p + bump * 3)}px)`);
  }

  /* ═════════════ 6. ЦИКЛ ═════════════ */
  function progress() {
    if (FORCE != null) return FORCE;
    const r = sec.getBoundingClientRect();
    const lead = vh * 0.55;
    return clamp((lead - r.top) / (lead + travel), 0, 1);
  }
  function tick(t) {
    raf = 0;
    const dt = Math.min(64, prevT ? t - prevT : 16); prevT = t;
    cur += (target - cur) * (1 - Math.exp(-dt / 95));
    if (Math.abs(target - cur) < 0.0004) cur = target;
    render(cur, false);
    if (cur !== target || now() < busyUntil) raf = requestAnimationFrame(tick);
    else prevT = 0;
  }
  function wake() { if (!raf && inView) raf = requestAnimationFrame(tick); }
  function onScroll() { if (!inView) return; target = progress(); wake(); }

  function start() {
    layout();
    if (isStatic()) { cur = target = 1; render(1, true); return; }
    if (FORCE != null) { cur = target = FORCE; render(FORCE, true); return; }
    cur = target = progress();
    // при загрузке страницы в середине блока — без «доигрывания» ударов
    render(cur, true);
    W.addEventListener('scroll', onScroll, { passive: true });
    if (W.IntersectionObserver) new IntersectionObserver((es) => { inView = es[es.length - 1].isIntersecting; if (inView) onScroll(); }, { rootMargin: '20% 0px' }).observe(sec);
    else inView = true;
  }
  let rzT = 0;
  function onResize() {
    clearTimeout(rzT);
    rzT = setTimeout(() => { const keep = cur; layout(); cur = keep; target = isStatic() ? 1 : FORCE != null ? FORCE : progress(); render(isStatic() ? 1 : cur, true); }, 120);
  }
  if (W.ResizeObserver) new ResizeObserver(onResize).observe(stage); else W.addEventListener('resize', onResize);
  if (RMQ.addEventListener) RMQ.addEventListener('change', () => { C = null; onResize(); });
  // печать — Unbounded: после загрузки шрифта перемерить фразу
  const remeasure = () => { if (E) { measureText(); render(cur, true); } };
  if (D.fonts) {
    if (D.fonts.ready) D.fonts.ready.then(remeasure);
    if (D.fonts.addEventListener) D.fonts.addEventListener('loadingdone', remeasure);
  }
  setTimeout(remeasure, 2500);
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start, { once: true }); else start();

  GV.tapeblock = { v: VAR, get progress() { return cur; }, set(p) { cur = target = clamp(p, 0, 1); render(cur, true); }, layout: () => { C = null; layout(); } };
})();
