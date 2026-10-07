/* GRINCHIN · игра «Точка сбора». Владелец: агент C.
   5 зелёных меток в .gm-slot[data-mark-slot] → каждая находка проявляет фрагмент логотипа в #gather-counter
   → 5/5: из фрагментов складывается полный GRINCHIN (финал серии 3) → бирка «Ранний доступ к предзаказу».
   Это игра, а не защита: прогресс и код живут только в браузере.
   Доступность: метки — кнопки с aria-label, но tabindex=-1 (не мусорят tab-порядок магазина).
   Клавиатурный/скринридерный путь — список маршрута в #gather-stage: «Туда →» с клавиатуры
   прокручивает к самой метке и ставит на неё фокус. Мышью — только к разделу: искать всё равно глазами. */
(() => {
  'use strict';
  const GV = (window.GV = window.GV || {});
  const D = document, R = D.documentElement, W = window;
  const TOTAL = 5, KEY = 'grinchin:gather:v1';
  const Q = new URLSearchParams(location.search);
  const isShot = () => R.dataset.shot === '1' || Q.get('shot') === '1';
  const mq = (s) => (W.matchMedia ? W.matchMedia(s) : { matches: false });
  const RM = mq('(prefers-reduced-motion: reduce)');
  const FINE = mq('(hover: hover) and (pointer: fine)');
  const calm = () => RM.matches || isShot();
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const pad = (n) => String(n).padStart(2, '0');

  // Логотип GRINCHIN — оригинальный вектор (pres_03, pdftocairo), viewBox 0 0 1850 386.
  const LOGO = [
    'M323 152C323 163 321 173 317 183C313 194 308 202 302 210C295 219 285 226 275 231C264 236 251 238 236 238C223 238 209 236 197 232C185 227 174 221 165 213C155 204 148 194 143 182C137 169 135 155 135 141C135 127 137 114 143 101C148 89 156 79 165 70C175 62 187 55 199 51C213 47 227 45 241 45C261 45 278 48 293 54C306 60 319 68 328 80C337 90 343 103 345 117L302 117C301 110 297 103 292 98C286 92 279 88 271 85C261 82 251 80 241 81C228 81 217 83 207 88C198 92 190 99 185 108C180 117 178 128 178 141C178 155 180 166 186 175C191 184 198 191 208 196C218 201 228 203 242 203C255 203 264 202 274 197C284 192 290 186 296 178C302 169 303 163 305 152ZM248 171L248 140L345 140L345 234L314 234L314 171Z',
    'M417 131L489 131C498 131 506 129 511 125C517 120 519 114 519 106C519 99 517 92 511 88C506 84 498 82 489 82L411 82L430 60L430 234L388 234L388 49L494 49C507 49 519 51 529 56C539 60 547 67 553 76C559 85 562 96 562 106C562 117 559 127 553 136C547 145 539 152 529 156C519 161 507 164 494 164L417 164ZM449 147L497 147L568 234L518 234Z',
    'M868 207L853 209L853 49L894 49L894 234L841 234L722 74L736 72L736 234L696 234L696 49L750 49Z',
    'M1147 159C1146 174 1140 188 1131 200C1121 213 1109 222 1095 228C1080 235 1063 238 1044 238C1022 238 1004 234 988 226C972 218 960 207 951 192C942 178 937 161 937 141C937 122 942 105 951 91C960 76 972 64 988 57C1004 49 1022 45 1044 45C1063 45 1080 48 1095 55C1109 61 1121 70 1131 82C1140 95 1146 109 1147 124L1105 124C1104 116 1100 108 1094 101C1089 95 1081 90 1073 87C1064 83 1054 81 1043 81C1030 81 1019 84 1009 89C1000 93 993 101 987 110C982 119 980 129 980 141C980 154 982 164 987 173C993 182 1000 190 1009 194C1019 199 1030 201 1043 201C1053 202 1064 200 1073 196C1081 193 1089 188 1094 182C1100 175 1103 167 1105 159Z',
    'M1190 49L1232 49L1232 234L1190 234ZM1213 122L1358 122L1358 159L1213 159ZM1339 49L1381 49L1381 234L1339 234Z',
    'M1682 207L1667 209L1667 49L1708 49L1708 234L1655 234L1536 74L1550 72L1550 234L1509 234L1509 49L1564 49Z',
    'M653 49L653 234L611 234L611 49L631 53Z',
    'M1466 49L1466 234L1424 234L1424 49L1445 53Z',
    'M925 384C925 384 933 372 951 360C970 347 992 336 1014 328C1070 308 1127 293 1201 287C1294 280 1378 285 1467 287C1549 289 1630 292 1693 270C1757 247 1790 208 1805 152C1819 101 1810 72 1810 72L1751 145L1746 142L1822 0C1832 32 1840 65 1844 99C1850 154 1834 255 1755 303C1679 349 1573 344 1462 338C1359 332 1250 317 1115 330C979 343 925 386 925 386C925 386 871 343 735 330C600 317 491 332 388 338C277 344 171 349 95 303C16 255 0 154 6 99C10 65 18 32 28 0L104 142L99 145L40 72C40 72 31 101 45 152C60 208 93 247 157 270C220 292 301 289 383 287C472 285 556 280 649 287C723 293 780 308 836 328C858 336 880 347 899 360C917 372 925 384 925 384Z',
  ];
  // 5 фрагментов: G · RI · NC · HIN · улыбка. Складываются слева направо по порядку находок.
  const FRAGS = [[0], [1, 6], [2, 3], [4, 7, 5], [8]];
  // Разлёт фрагментов перед сборкой (единицы viewBox логотипа)
  const SCATTER = [[-260, -150, -24], [-90, 210, 18], [140, -230, -14], [300, 170, 22], [0, 260, -8]];

  // Граффити-знаки меток (viewBox 0 0 48 48, штрих)
  const GLYPH = {
    1: '<path d="M7 21c5 13 29 13 34 0"/><path d="M7 21L4.5 11M41 21l2.5-10"/><path class="d" d="M24 31.5v7"/>',
    2: '<path d="M11 37L35 13"/><path d="M19 12.5h16.5V29"/><path class="d" d="M35.5 29v8"/>',
    3: '<path d="M37 15.5A14 14 0 1 0 38.5 28H26"/><path class="d" d="M38.5 28v10"/>',
    4: '<path d="M17 6h14l10 10v14L31 40H17L7 30V16z"/><path d="M15 23c4 7 14 7 18 0"/><path d="M15 23l-1.5-4M33 23l1.5-4"/>',
    5: '<circle class="f" cx="24" cy="24" r="5"/><circle cx="24" cy="24" r="14"/><path d="M24 4v6M24 38v6M4 24h6M38 24h6"/>',
  };
  const glyph = (n, cls = '') => `<svg class="gm-glyph ${cls}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${GLYPH[n]}</svg>`;

  const PLACES = {
    1: { sec: 'hero', where: 'Первый экран', hint: 'Смотри по сторонам.' },
    2: { sec: 'drop', where: 'Дроп 01', hint: 'Шестая вещь, угол карточки.' },
    3: { sec: 'looks', where: 'Образы', hint: 'Там, где лента держит фото.' },
    4: { sec: 'about', where: 'О бренде', hint: 'Где STOP становится стартом.' },
    5: { sec: 'footer', where: 'Самый низ', hint: 'Под лентой. Оторви её.' },
  };

  // Правила — один источник для раздела #gather и окна «Как играть» (#game-help)
  const RULES = [
    ['Ищи', '5 зелёных меток спрятаны на сайте. Жми на них.'],
    ['Собирай', 'Каждая — кусок логотипа. G на первом экране — компас.'],
    ['Забирай', '5 из 5 — код раннего доступа к предзаказу.'],
  ];
  const STREET = 'Видел такой стикер на улице? Сканируй QR — метка засчитается.';
  const rulesHTML = () =>
    `<ol class="gm-rules">${RULES.map(([b, t], i) => `<li><span class="gm-rules__n" aria-hidden="true">${pad(i + 1)}</span><b>${b}</b><span class="gm-rules__t">${t}</span></li>`).join('')}</ol>` +
    `<p class="gm-street"><span aria-hidden="true">${glyph(1)}</span>${STREET}</p>`;

  // Карта района (viewBox 0 0 800 560): улицы, маршруты по сетке, точка сбора
  const PTS = { 1: [96, 90], 2: [700, 90], 3: [96, 500], 4: [700, 400], 5: [330, 500] };
  const TGT = [470, 290];
  const ROUTES = {
    1: [[96, 90], [210, 90], [210, 190], [470, 190], [470, 290]],
    2: [[700, 90], [590, 90], [590, 290], [470, 290]],
    3: [[96, 500], [96, 400], [330, 400], [330, 290], [470, 290]],
    4: [[700, 400], [700, 290], [470, 290]],
    5: [[330, 500], [470, 500], [470, 290]],
  };

  // ── состояние ────────────────────────────────────────────────────────────
  const forced = Q.has('game') ? parseInt(Q.get('game'), 10) : NaN;
  const demo = forced >= 0 && forced <= TOTAL;
  let st = { found: [], sid: '' };
  if (demo) st = { found: [1, 2, 3, 4, 5].slice(0, forced), sid: 'demo' };
  else {
    try {
      const j = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (j && Array.isArray(j.found)) {
        st.found = j.found.filter((n, i, a) => Number.isInteger(n) && n >= 1 && n <= TOTAL && a.indexOf(n) === i);
        st.sid = typeof j.sid === 'string' ? j.sid.slice(0, 40) : '';
      }
    } catch (e) { /* хранилище недоступно — играем в памяти */ }
  }
  if (!st.sid) {
    try { const a = new Uint32Array(2); crypto.getRandomValues(a); st.sid = a[0].toString(36) + a[1].toString(36); }
    catch (e) { st.sid = Math.random().toString(36).slice(2) + Date.now().toString(36); }
  }
  const save = () => { if (demo) return; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* без хранилища */ } };
  const has = (n) => st.found.includes(n);
  const isComplete = () => st.found.length >= TOTAL;

  // Код доступа: детерминированно из id сессии, формат GRN-XXXX-XXXX (без 0/O/1/I/L)
  function accessCode(sid) {
    let h = 2166136261 >>> 0;
    for (const ch of 'grinchin:' + sid) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let x = h || 1, s = '';
    for (let i = 0; i < 8; i++) { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; s += A[x % A.length]; }
    return `GRN-${s.slice(0, 4)}-${s.slice(4)}`;
  }

  // ── узлы ────────────────────────────────────────────────────────────────
  const slots = {};            // n → .gm-slot
  let counter = null, stage = null, pendingAssemble = false;

  const logoSVG = (cls) =>
    `<svg class="${cls}" viewBox="-12 -12 1874 410" aria-hidden="true" focusable="false">` +
    FRAGS.map((f, k) => `<g class="gm-frag" data-f="${k + 1}" style="--k:${k};--dx:${SCATTER[k][0]}px;--dy:${SCATTER[k][1]}px;--r:${SCATTER[k][2]}deg">${f.map((i) => `<path d="${LOGO[i]}"/>`).join('')}</g>`).join('') +
    `</svg>`;

  function paintFrags(root, popIdx) {
    if (!root) return;
    root.querySelectorAll('.gm-frag').forEach((g) => {
      const k = +g.dataset.f;
      g.classList.toggle('is-on', k <= st.found.length);
      if (k === popIdx && !calm()) { g.classList.remove('is-pop'); void g.getBoundingClientRect(); g.classList.add('is-pop'); }
    });
  }

  // ── метки ───────────────────────────────────────────────────────────────
  let markIO = null; const inView = new Set();
  function bindSlot(slot) {
    const n = +slot.dataset.markSlot;
    if (!(n >= 1 && n <= TOTAL)) return;
    slot.dataset.gm = '1';
    slots[n] = slot;
    slot.innerHTML = '';
    const b = D.createElement('button');
    b.type = 'button'; b.className = 'gm-mark'; b.dataset.n = n; b.tabIndex = -1;
    b.style.setProperty('--dl', `${-(n * 1.7) % 7}s`);
    b.style.setProperty('--rot', `${[-9, 7, -4, 11, -6][n - 1]}deg`);
    slot.appendChild(b);
    paintMark(n);
    // клик по метке не должен открывать карточку товара (метка 2 сидит в карточке)
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); find(n, b); });
    b.addEventListener('blur', () => b.classList.remove('is-hint'));
    if (markIO) markIO.observe(b);
  }
  function paintMark(n) {
    const slot = slots[n]; if (!slot) return;
    const b = slot.querySelector('.gm-mark'); if (!b) return;
    const got = has(n);
    slot.classList.toggle('gm-slot--found', got);
    b.disabled = got;
    b.setAttribute('aria-label', got ? `Метка ${n} из ${TOTAL} — найдена` : `Метка ${n} из ${TOTAL}`);
    b.innerHTML = got
      ? '<svg class="gm-glyph gm-glyph--gone" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M9 11h24l6 6v20H9z"/><path d="M33 11v6h6"/></svg>'
      : glyph(n);
  }

  function find(n, el, source) {
    if (has(n)) return;
    st.found.push(n); save();
    const idx = st.found.length, snap = st.found.slice(), done = isComplete();
    paintMark(n); paintStage(n);
    // событие — сразу (тост A, эффект B, «чпок» 3D); фрагмент в шапке загорается, когда долетит стикер
    D.dispatchEvent(new CustomEvent('grinchin:mark', { detail: { n, found: snap, total: TOTAL, source: source || 'site' } }));
    const after = () => {
      paintFrags(counter, idx); paintCounter(); paintHelp();
      if (done) {
        pendingAssemble = true; maybeAssemble();
        D.dispatchEvent(new CustomEvent('grinchin:gather-complete'));
      }
    };
    if (el && !calm() && el.animate) fly(el, n, idx, after);
    else after();
  }

  // стикер срывается и летит в счётчик
  function fly(el, n, idx, done) {
    const a = el.getBoundingClientRect();
    let b = counter && counter.querySelector(`.gm-frag[data-f="${idx}"]`);
    b = b && b.getBoundingClientRect();
    const okB = b && b.width && b.bottom > 0 && b.top < innerHeight;
    const bx = okB ? b.left + b.width / 2 : innerWidth - 60, by = okB ? b.top + b.height / 2 : 24;
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    const s = D.createElement('div');
    s.className = 'gm-fly'; s.innerHTML = glyph(n);
    s.style.left = ax - 28 + 'px'; s.style.top = ay - 28 + 'px';
    D.body.appendChild(s);
    const dx = bx - ax, dy = by - ay, lift = Math.min(160, 60 + Math.abs(dy) * 0.25);
    let fin = false; const end = () => { if (fin) return; fin = true; s.remove(); done(); };
    try {
      const an = s.animate([
        { transform: 'translate(0,0) rotate(0deg) scale(1)', boxShadow: '0 2px 4px rgba(0,0,0,.4)' },
        { transform: 'translate(-6px,-14px) rotate(-16deg) scale(1.35)', boxShadow: '0 18px 28px rgba(0,0,0,.55)', offset: 0.2 },
        { transform: `translate(${dx * 0.45}px,${dy * 0.45 - lift}px) rotate(150deg) scale(1)`, offset: 0.58 },
        { transform: `translate(${dx}px,${dy}px) rotate(330deg) scale(.22)`, opacity: 0.35 },
      ], { duration: 980, easing: 'cubic-bezier(.45,.05,.35,1)' });
      an.onfinish = end; an.oncancel = end;
      setTimeout(end, 1400);
    } catch (e) { end(); }
  }

  // мерцание при приближении курсора
  let nearRaf = 0, px = -1e4, py = -1e4;
  function onPointer(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    px = e.clientX; py = e.clientY;
    if (!nearRaf && inView.size) nearRaf = requestAnimationFrame(() => {
      nearRaf = 0;
      inView.forEach((b) => {
        if (b.disabled) return;
        const r = b.getBoundingClientRect();
        const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        b.style.setProperty('--near', clamp(1 - (d - 30) / 220, 0, 1).toFixed(2));
      });
    });
  }

  // ── счётчик в шапке ──────────────────────────────────────────────────────
  function bindCounter(c) {
    c.dataset.gm = '1';
    counter = c;
    c.innerHTML = `<button class="gm-counter" type="button" aria-haspopup="dialog">${logoSVG('gm-counter__logo')}<span class="gm-counter__num" aria-hidden="true"><i>метки</i> <b>0</b>/${TOTAL}</span></button>`;
    c.firstChild.addEventListener('click', () => { if (GV.open && GV.open('game')) return; nav('gather'); });
    paintFrags(c); paintCounter();
  }
  function paintCounter() {
    if (!counter) return;
    const b = counter.querySelector('.gm-counter'); if (!b) return;
    b.querySelector('b').textContent = st.found.length;
    b.classList.toggle('is-done', isComplete());
    b.setAttribute('aria-label', isComplete()
      ? 'Точка сбора: 5 из 5. Забрать код'
      : `Точка сбора: меток ${st.found.length} из ${TOTAL}. Как играть`);
    b.title = isComplete() ? 'Маршрут сошёлся' : 'Точка сбора — как играть';
  }
  function nav(target) {
    const ev = new CustomEvent('grinchin:navigate', { detail: { target }, cancelable: true });
    D.dispatchEvent(ev);
    if (!ev.defaultPrevented) {
      const el = D.getElementById(target);
      if (el) el.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'start' });
    }
  }

  // ── сцена «Точка сбора» ──────────────────────────────────────────────────
  function mapSVG() {
    const X = [96, 210, 330, 470, 590, 700], Y = [90, 190, 290, 400, 500];
    const line = (pts) => pts.map((p) => p.join(',')).join(' ');
    let s = `<svg class="gm-map__svg" viewBox="0 0 800 560" aria-hidden="true" focusable="false">
<defs>
 <marker id="gm-arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="gm-arr" d="M1 1l7 4-7 4"/></marker>
 <marker id="gm-arr-on" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="gm-arr gm-arr--on" d="M1 1l7 4-7 4"/></marker>
 <pattern id="gm-hatch" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)"><rect width="14" height="14" class="gm-hatch-a"/><rect width="7" height="14" class="gm-hatch-b"/></pattern>
</defs>
<rect class="gm-map__bg" width="800" height="560"/>
<path class="gm-street gm-street--diag" d="M-10 340L340 -10"/>`;
    X.forEach((x) => { s += `<path class="gm-street" d="M${x} -10V570"/>`; });
    Y.forEach((y) => { s += `<path class="gm-street${y === 290 ? ' gm-street--main' : ''}" d="M-10 ${y}H810"/>`; });
    s += `<text class="gm-map__t" x="20" y="282">пр. Запретный</text>
<text class="gm-map__t" x="600" y="182">ул. Заданная</text>
<text class="gm-map__t" transform="translate(582 470) rotate(-90)">ул. Обходная</text>
<text class="gm-map__t" transform="translate(322 250) rotate(-90)">пер. Щель</text>
<text class="gm-map__t" transform="translate(112 236) rotate(-45)">обход</text>
<rect class="gm-park" x="612" y="436" width="170" height="110" rx="2"/>
<text class="gm-map__t" x="624" y="532">сквер</text>
<g class="gm-barrier"><rect x="222" y="278" width="96" height="24" fill="url(#gm-hatch)"/>
 <path class="gm-stop" d="M262 267h16l11 11v16l-11 11h-16l-11-11v-16z"/><text class="gm-stop__t" x="270" y="290" text-anchor="middle">STOP</text></g>`;
    for (let n = 1; n <= TOTAL; n++) s += `<polyline class="gm-route" data-n="${n}" points="${line(ROUTES[n])}"/>`;
    s += `<g class="gm-target" transform="translate(${TGT[0]} ${TGT[1]})"><circle class="gm-target__ring" r="30"/><circle class="gm-target__ring gm-target__ring--2" r="30"/><circle class="gm-target__dot" r="11"/>
 <text class="gm-target__t" y="-44" text-anchor="middle">ТОЧКА СБОРА</text></g>`;
    for (let n = 1; n <= TOTAL; n++) {
      const [x, y] = PTS[n];
      const lx = x > 600 ? -30 : 28, anchor = x > 600 ? 'end' : 'start';
      s += `<g class="gm-pt" data-n="${n}" transform="translate(${x} ${y})"><circle class="gm-pt__c" r="21"/>
 <g class="gm-pt__g" transform="translate(-15 -15) scale(.625)">${GLYPH[n]}</g><text class="gm-pt__q" y="7" text-anchor="middle">?</text>
 <text class="gm-pt__n" x="${lx}" y="-14" text-anchor="${anchor}">${pad(n)}</text></g>`;
    }
    return s + '</svg>';
  }

  function bindStage(el) {
    el.dataset.gm = '1';
    stage = el;
    const items = [1, 2, 3, 4, 5].map((n) => `<li class="gm-item" data-n="${n}">
 <span class="gm-item__n">${pad(n)}</span>
 <span class="gm-item__body"><span class="gm-item__where">${PLACES[n].where}</span><span class="gm-item__hint">${PLACES[n].hint}</span></span>
 <span class="gm-item__state"></span>
 <button class="gm-go" type="button" data-n="${n}" aria-label="Метка ${n}: ${PLACES[n].where}. Перейти">Туда →</button></li>`).join('');
    el.innerHTML = `<div class="gm-cq"><div class="gm" data-state="play">
 <div class="gm-map">${mapSVG()}<div class="gm-map__legend"><span>N ↑</span><span>район «Дроп 01»</span><span>масштаб 1:1</span></div></div>
 <div class="gm-panel">
  <div class="gm-logo">
   <span class="gm-stk gm-stk--tape" style="--r:-3deg;--k:0" aria-hidden="true">МАРШРУТ СОШЁЛСЯ • GRINCHIN • ТОЧКА СБОРА • МАРШРУТ СОШЁЛСЯ • GRINCHIN •</span>
   ${logoSVG('gm-logo__svg')}
   <span class="gm-stk gm-stk--start" style="--r:-12deg;--k:1" aria-hidden="true">ST’ART</span>
   <span class="gm-stk gm-stk--smile" style="--r:9deg;--k:2" aria-hidden="true">${glyph(1)}</span>
  </div>
  <p class="gm-status" role="status" aria-live="polite"></p>
  <div class="gm-play">
   <ol class="gm-list" aria-label="Маршрут: 5 меток">${items}</ol>
  </div>
  <div class="gm-done" hidden>
   <div class="gm-tag" role="group" aria-label="Награда: ранний доступ к предзаказу">
    <span class="gm-tag__tape" aria-hidden="true"></span>
    <span class="gm-tag__hole" aria-hidden="true"></span>
    <svg class="gm-tag__glow" viewBox="0 0 1850 386" aria-hidden="true" focusable="false"><path d="${LOGO[8]}"/></svg>
    <p class="gm-tag__kicker">точка сбора · 5/5</p>
    <p class="gm-tag__title">Ранний доступ<br>к предзаказу</p>
    <div class="gm-tag__grid"><div><span class="k">drop:</span><span class="v">01</span></div><div><span class="k">access:</span><span class="v">early</span></div></div>
    <div class="gm-tag__code"><span class="k">code:</span><output class="v gm-code"></output></div>
    <button class="gm-copy" type="button">Скопировать</button>
    <p class="gm-tag__note">Отправь код нам в Telegram — откроем предзаказ раньше всех.</p>
   </div>
  </div>
  <button class="gm-reset" type="button" hidden>↺ заново</button>
 </div>
</div></div>`;
    el.querySelectorAll('.gm-go').forEach((b) => b.addEventListener('click', (e) => go(+b.dataset.n, e.detail === 0)));
    el.querySelectorAll('.gm-pt').forEach((p) => p.addEventListener('click', () => go(+p.dataset.n, false)));
    el.querySelector('.gm-copy').addEventListener('click', (e) => copy(e.currentTarget));
    el.querySelector('.gm-reset').addEventListener('click', reset);
    if (W.IntersectionObserver) new IntersectionObserver((es) => { if (es[0].isIntersecting) maybeAssemble(); }, { threshold: 0.35 }).observe(el);
    paintStage();
  }

  function paintStage(justFound) {
    if (!stage) return;
    const root = stage.querySelector('.gm'); if (!root) return;
    const done = isComplete(), k = st.found.length;
    root.dataset.state = done ? 'done' : 'play';
    paintFrags(root.querySelector('.gm-logo'), justFound ? k : 0);
    root.querySelectorAll('.gm-route').forEach((r) => r.classList.toggle('is-on', has(+r.dataset.n)));
    root.querySelectorAll('.gm-pt').forEach((p) => {
      const n = +p.dataset.n; p.classList.toggle('is-on', has(n));
      if (n === justFound && !calm()) { p.classList.remove('is-pop'); void p.getBoundingClientRect(); p.classList.add('is-pop'); }
    });
    root.querySelectorAll('.gm-item').forEach((li) => {
      const n = +li.dataset.n, got = has(n);
      li.classList.toggle('is-on', got);
      li.querySelector('.gm-item__state').textContent = got ? 'найдена' : '';
      li.querySelector('.gm-go').hidden = got;
    });
    root.querySelector('.gm-status').textContent = done
      ? 'Маршрут сошёлся.'
      : k === 0 ? `0 из ${TOTAL}. Начни с первого экрана.` : `Найдено ${k} из ${TOTAL}.`;
    root.querySelector('.gm-play').hidden = done;
    root.querySelector('.gm-done').hidden = !done;
    root.querySelector('.gm-reset').hidden = k === 0;
    root.querySelector('.gm-code').textContent = accessCode(st.sid);
  }
  function maybeAssemble() {
    if (!pendingAssemble || !stage || calm()) { pendingAssemble = false; return; }
    const r = stage.getBoundingClientRect();
    if (r.top > innerHeight * 0.75 || r.bottom < innerHeight * 0.25) return;
    pendingAssemble = false;
    const g = stage.querySelector('.gm');
    g.classList.remove('gm--assemble'); void g.offsetWidth; g.classList.add('gm--assemble');
  }

  // «Туда →»: мышью — к разделу; с клавиатуры — к самой метке и фокус на неё
  function go(n, kb) {
    const slot = slots[n], b = slot && slot.querySelector('.gm-mark');
    if (kb && b && !b.disabled) {
      b.tabIndex = 0; b.classList.add('is-hint');
      b.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'center' });
      setTimeout(() => b.focus({ preventScroll: true }), calm() ? 0 : 450);
      return;
    }
    nav(D.getElementById(PLACES[n].sec) ? PLACES[n].sec : 'gather');
  }

  async function copy(btn) {
    const code = accessCode(st.sid); let ok = false;
    try { await navigator.clipboard.writeText(code); ok = true; } catch (e) {
      try {
        const t = D.createElement('textarea'); t.value = code; t.setAttribute('readonly', '');
        t.style.cssText = 'position:fixed;left:-999px;opacity:0'; D.body.appendChild(t); t.select();
        ok = D.execCommand('copy'); t.remove();
      } catch (e2) { ok = false; }
    }
    btn.textContent = ok ? 'Скопировано ✓' : 'Выдели код и скопируй';
    btn.classList.toggle('is-ok', ok);
    clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = 'Скопировать'; btn.classList.remove('is-ok'); }, 2400);
  }

  function reset() {
    st.found = []; save(); pendingAssemble = false;
    for (let n = 1; n <= TOTAL; n++) { paintMark(n); const b = slots[n] && slots[n].querySelector('.gm-mark'); if (b) b.tabIndex = -1; }
    paintFrags(counter); paintCounter(); paintStage(); paintHelp();
    if (stage) stage.querySelector('.gm').classList.remove('gm--assemble');
    R.dataset.gather = 'play';
    if (GV.g3d && GV.g3d.refresh) GV.g3d.refresh();
  }

  // ── окно «Как играть» (#game-help, открывает A: GV.open('game')) ──────────
  let help = null, fromStreet = false;
  function bindHelp(el) {
    el.dataset.gm = '1';
    help = el;
    el.innerHTML = `<div class="gh">
 <p class="gh-street" hidden>Метка с улицы засчитана.</p>
 <div class="gh-progress">${logoSVG('gh-logo')}<p class="gh-num" aria-live="polite"></p></div>
 <div class="gh-play">${rulesHTML()}
  <div class="gh-act"><button class="btn btn--accent" type="button" data-close>Понятно, ищу</button><button class="btn btn--ghost" type="button" data-nav="gather">Карта меток</button></div>
 </div>
 <div class="gh-done" hidden><p class="gh-done-t">Маршрут сошёлся. Твой код — в точке сбора.</p>
  <div class="gh-act"><button class="btn btn--accent" type="button" data-nav="gather">Забрать код →</button></div>
 </div>
</div>`;
    paintHelp();
  }
  function paintHelp() {
    if (!help) return;
    const k = st.found.length, done = isComplete();
    paintFrags(help.querySelector('.gh-progress'));
    help.querySelector('.gh-num').innerHTML = `<b>${k}</b>/${TOTAL} <span>${done ? 'собрано' : 'меток'}</span>`;
    help.querySelector('.gh-street').hidden = !fromStreet;
    help.querySelector('.gh-play').hidden = done;
    help.querySelector('.gh-done').hidden = !done;
  }

  // первое знакомство: после первой прокрутки — тихий тост «Как играть →» и подсветка счётчика
  const INV = 'grinchin:gather:invited';
  function invite() {
    if (isShot() || demo || isComplete()) return;
    try { if (localStorage.getItem(INV)) return; } catch (e) { /* без хранилища — пригласим один раз за визит */ }
    let gone = false;
    const onScroll = () => {
      if (gone || W.scrollY < innerHeight * 0.5) return;
      gone = true; W.removeEventListener('scroll', onScroll);
      try { localStorage.setItem(INV, '1'); } catch (e) { /* ок */ }
      if (GV.overlay || st.found.length) return;
      if (GV.toast) GV.toast('На сайте 5 меток. Как играть →', 8000, () => GV.open && GV.open('game'));
      const b = counter && counter.querySelector('.gm-counter');
      if (b) { b.classList.add('is-invite'); setTimeout(() => b.classList.remove('is-invite'), 8000); }
    };
    W.addEventListener('scroll', onScroll, { passive: true });
  }

  // QR на уличном стикере: ?mark=street (следующая не найденная) или ?mark=3 (конкретная)
  function streetMark() {
    const m = (Q.get('mark') || '').toLowerCase();
    if (!m) return;
    const n = m === 'street' ? [1, 2, 3, 4, 5].find((x) => !has(x)) : parseInt(m, 10);
    if (!(n >= 1 && n <= TOTAL)) return;
    fromStreet = true;
    if (!has(n)) find(n, null, 'street');
    paintHelp();
    if (!isShot()) {
      try { const u = new URL(location.href); u.searchParams.delete('mark'); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) { /* file:// */ }
    }
    // с улицы человек пришёл без контекста — сразу объясняем, что это (если не просили открыть другое)
    if (Q.get('open')) return;
    const show = () => { if (GV.open && !GV.overlay) GV.open('game'); };
    if (isShot()) show();
    else if (R.getAttribute('data-loader') === 'off') setTimeout(show, 400); // без лоадера ready мог уже пройти
    else { D.addEventListener('grinchin:ready', () => setTimeout(show, 400), { once: true }); setTimeout(show, 4500); }
  }

  // ── публичное API ────────────────────────────────────────────────────────
  GV.game = {
    total: TOTAL,
    get found() { return st.found.slice(); },
    isComplete,
    find: (n) => find(n, slots[n] && slots[n].querySelector('.gm-mark')),
    reset,
    code: () => accessCode(st.sid),
    // ближайшая ненайденная метка к точке (x,y) во вьюпорте — для компаса 3D-G
    target(x, y) {
      let best = null;
      for (let n = 1; n <= TOTAL; n++) {
        if (has(n)) continue;
        const s = slots[n]; if (!s || !s.isConnected) continue;
        const r = s.getBoundingClientRect(); if (!r.width && !r.height) continue;
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2, d = Math.hypot(cx - x, cy - y);
        if (!best || d < best.dist) best = { n, x: cx, y: cy, dist: d };
      }
      return best;
    },
  };

  // ── инициализация по наличию узлов (разметку делает A) ─────────────────────
  function scan() {
    D.querySelectorAll('.gm-slot[data-mark-slot]:not([data-gm])').forEach(bindSlot);
    const c = D.getElementById('gather-counter'); if (c && !c.dataset.gm) bindCounter(c);
    const s = D.getElementById('gather-stage'); if (s && !s.dataset.gm) bindStage(s);
    const h = D.querySelector('[data-gh-body]'); if (h && !h.dataset.gm) bindHelp(h);
    D.querySelectorAll('[data-gm-rules]:not([data-gm])').forEach((r) => { r.dataset.gm = '1'; r.innerHTML = rulesHTML(); });
  }
  function init() {
    if (W.IntersectionObserver) markIO = new IntersectionObserver((es) => es.forEach((e) => {
      e.target.classList.toggle('is-in', e.isIntersecting);
      if (e.isIntersecting) inView.add(e.target); else { inView.delete(e.target); e.target.style.setProperty('--near', 0); }
    }));
    scan();
    if (W.MutationObserver) {
      let pend = false;
      new MutationObserver(() => { if (!pend) { pend = true; requestAnimationFrame(() => { pend = false; scan(); }); } })
        .observe(R, { childList: true, subtree: true });
    }
    if (FINE.matches) W.addEventListener('pointermove', onPointer, { passive: true });
    R.dataset.gather = isComplete() ? 'done' : 'play';
    D.addEventListener('grinchin:gather-complete', () => { R.dataset.gather = 'done'; });
    streetMark();
    invite();
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
