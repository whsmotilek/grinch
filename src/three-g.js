/* GRINCHIN v2 · K2 · сквозной объект «G в рогах» → window.GV.g
   Один объект ведёт через весь сайт: рождается на своём месте в hero, когда прелоадер раскрывает сайт →
   в hero следит за курсором / свайпом / наклоном → при прокрутке уменьшается и уходит компаньоном
   в правое поле (desktop) / в угол (mobile, только при прокрутке вверх) → над «Дропом» смотрит на карточку
   под курсором → в «Образах» поворачивается к отпечатку в центре → в «Знаке» прячется → на подписку делает
   оборот → в подвале летит к букве G логотипа и растворяется ДО касания букв. Открыт оверлей — уходит.
   Правило: знак никогда не лежит поверх контента. Остановились, а под ним текст/кнопка/фото — гаснет.

   Техника (причины рывков v1 — audit/04 §2.3; правки — verify/03):
   · three.js рендерит в Web Worker через OffscreenCanvas: импорт, геометрия, текстуры не трогают главный
     поток. three.core — минифицированный (подмена импорта в воркере, −125 КБ br). Компиляция шейдеров:
     desktop — сразу, mobile — после рождения в простое (в hero до этого SVG-знак, подмена — затуханием).
     Программный WebGL (SwiftShader/llvmpipe) → SVG: там компиляция замораживает страницу на ~0,9 с.
     Нет OffscreenCanvas-WebGL — тот же движок на главном потоке в requestIdleCallback (?glmain).
   · Канвас один, фиксированный; двигается и масштабируется только CSS-transform. WebGL перерисовывает кадр,
     лишь когда меняется поворот; в покое — 0 кадров. Двойников-картинок больше нет — нет и скачков подмены.
   · Один цикл — gsap.ticker; сглаживание по dt: x += (t−x)·(1−e^(−λ·dt)) — одинаково на 30/60/120 Гц.
     Скачок прокрутки > 0,5 экрана (End/Home, якорь) — знак гаснет на месте, переносится и проявляется.
   · Чтений layout в цикле нет: прямоугольники меряются в measure(); при остановке — одна проверка
     elementsFromPoint под знаком.
   · Фолбэк (нет WebGL, ошибка, слабое устройство, reduced-motion): SVG того же контура — в hero статично,
     компаньон без движения за прокруткой.
   Контуры — оригинальный вектор из PDF (стр. 14), тот же, что в svg/g-horns.svg.
   Отладка: ?nogl — SVG; ?glmain — WebGL на главном потоке; ?soft — разрешить программный WebGL. */
(() => {
  'use strict';
  const GV = (window.GV = window.GV || {});
  const D = document, R = D.documentElement, W = window;
  if (GV.g && GV.g.v === 2) return;

  // Центр знака — (0,0), ось Y вниз (как в SVG). 1 единица three = 130 единиц SVG.
  const P_HORNS = 'M0 124.8C0 124.8 11.5 89.3 51.3 72.8C95.1 54.6 121.7 35.8 140 5.3C163.5-33.5 144.5-82 144.5-82L95.8-24.2L93.9-25.5C93.9-25.5 141.5-119.2 146.9-130C146.9-130 196.1-66.6 180 0.4C164.7 64.1 103.9 74 60.1 86C18.2 97.5 0 129.3 0 129.3C0 129.3-18.2 97.5-60.2 86C-104 74-164.8 64.1-180.1 0.4C-196.2-66.6-147-130-147-130C-141.5-119.2-94-25.5-94-25.5L-95.9-24.2L-144.5-82C-144.5-82-163.6-33.5-140.1 5.3C-121.7 35.8-95.2 54.7-51.3 72.8C-11.5 89.3 0 124.8 0 124.8Z';
  const P_G = 'M61.1-14.6C61-6.8 59.4 0.9 56.4 8.1C53.9 15.2 50.2 21.8 45.5 27.7C40.1 34.2 33.3 39.4 25.6 42.9C17.4 46.6 8.2 48.4-2.9 48.4C-12.7 48.5-22.5 46.9-31.7 43.6C-40.4 40.5-48.3 35.8-55.1 29.6C-62.1 23.5-67.7 15.9-71.4 7.3C-75.4-2.1-77.4-12.3-77.2-22.6C-77.4-32.9-75.4-43.1-71.3-52.6C-67.5-61.1-61.9-68.7-54.8-74.9C-47.5-81.1-39.1-85.8-30.1-88.8C-20.1-92.1-9.6-93.7 0.9-93.6C15.5-93.6 28.1-91.4 38.8-86.8C48.8-82.7 57.7-76.2 64.7-68C71.3-60.1 75.5-50.6 77-40.5L45.9-40.5C44.8-45.9 42-50.9 38-54.9C33.6-59.1 28.3-62.2 22.5-64.1C15.6-66.4 8.3-67.5 0.9-67.3C-8.7-67.3-16.9-65.6-23.9-62.2C-30.7-58.9-36.4-53.6-40.1-47C-44-40.3-45.9-32.2-45.9-22.6C-45.9-13-43.9-4.8-39.9 2C-35.9 8.8-31.3 14-23.8 17.5C-16.3 21.1-8.7 22.9 1.4 22.9C11.2 22.9 17.8 21.7 25.1 18.3C32.3 14.8 37 10 41 4.1C45.3-2.2 46.2-7.1 47.9-14.6ZM6.2-0.9L6.2-23.3L77-23.3L77 45.7L54.7 45.7L54.7-0.9Z';
  const GC = [-0.2, -22.6];               // центр G — ось вращения стрелки (ед. SVG)
  const FILL = 0.78, ASPECT = 1.4;        // знак = 78 % ширины кадра, кадр 1.4 : 1 (одинаково в WebGL, SVG и двойнике)
  const MARK_W = 392;                     // ширина знака, ед. SVG
  const VB_W = MARK_W / FILL, VB_H = VB_W / ASPECT;
  const VB = `${(-VB_W / 2).toFixed(1)} ${(-VB_H / 2).toFixed(1)} ${VB_W.toFixed(1)} ${VB_H.toFixed(1)}`;
  const LOGO = { w: 1854, h: 390 };      // svg/logo.svg; буква G — bbox 137..347 × 47..240
  const URL3 = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.186.1/three.module.min.js';
  const NEUTRAL = { rx: 0.1, ry: -0.3 };  // поза покоя = поза двойника (стыковки без скачка)

  const Q = new URLSearchParams(location.search);
  const SHOT = R.dataset.shot === '1' || Q.get('shot') === '1';
  const mq = (s) => (W.matchMedia ? W.matchMedia(s) : { matches: false, addEventListener() {} });
  const RMQ = mq('(prefers-reduced-motion: reduce)');
  const FINEQ = mq('(hover: hover) and (pointer: fine)');
  const NARROWQ = mq('(max-width: 767px)');
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (x, t, l, dt) => x + (t - x) * (1 - Math.exp(-l * dt));
  const eio = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);   // power2.inOut
  const eo3 = (t) => 1 - Math.pow(1 - t, 3);                                    // power3.out
  const now = () => performance.now();
  const tok = (n, f) => { try { return getComputedStyle(R).getPropertyValue(n).trim() || f; } catch (e) { return f; } };

  /* ═════════════════════ ДВИЖОК WebGL (работает и в воркере, и на главном потоке) ═════════════════════
     Самодостаточная функция: в воркер уходит её исходник (toString), внешних ссылок нет. */
  function ENGINE(T, canvas, o) {
    const TAU = Math.PI * 2, U = 130;
    function shapes(d) {                     // path d → THREE.Shape[] (M/L/H/V/C/Q/Z, абс. и отн.)
      const tk = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
      const out = []; let s = null, cmd = '', i = 0, x = 0, y = 0, sx = 0, sy = 0;
      const n = () => +tk[i++], P = (px, py) => [px / U, -py / U];
      while (i < tk.length) {
        if (/[a-zA-Z]/.test(tk[i])) cmd = tk[i++];
        const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
        if (C === 'Z') { if (s) s.closePath(); x = sx; y = sy; continue; }
        if (C === 'M') { x = ox + n(); y = oy + n(); sx = x; sy = y; s = new T.Shape(); out.push(s); s.moveTo(...P(x, y)); cmd = rel ? 'l' : 'L'; }
        else if (C === 'L') { x = ox + n(); y = oy + n(); s.lineTo(...P(x, y)); }
        else if (C === 'H') { x = ox + n(); s.lineTo(...P(x, y)); }
        else if (C === 'V') { y = oy + n(); s.lineTo(...P(x, y)); }
        else if (C === 'C') { const a = [ox + n(), oy + n(), ox + n(), oy + n(), ox + n(), oy + n()]; s.bezierCurveTo(...P(a[0], a[1]), ...P(a[2], a[3]), ...P(a[4], a[5])); x = a[4]; y = a[5]; }
        else if (C === 'Q') { const a = [ox + n(), oy + n(), ox + n(), oy + n()]; s.quadraticCurveTo(...P(a[0], a[1]), ...P(a[2], a[3])); x = a[2]; y = a[3]; }
        else i++;
      }
      return out;
    }
    const cv2d = (w, h) => {
      if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
      const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
    };
    const rng = (seed) => { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };

    // matcap: «сфера» с готовым светом — кислотно-зелёный глянец скотча, блик сверху-слева, тонкий контровой край
    function matcap(N, stops, spots, rim) {
      const c = cv2d(N, N), g = c.getContext('2d'), h = N / 2;
      g.fillStyle = stops[stops.length - 1][1]; g.fillRect(0, 0, N, N);
      const rg = g.createRadialGradient(N * 0.4, N * 0.34, 0, h, h, h);
      for (const [t, col] of stops) rg.addColorStop(t, col);
      g.fillStyle = rg; g.beginPath(); g.arc(h, h, h, 0, TAU); g.fill();
      if (rim) {
        const r2 = g.createRadialGradient(h, h, N * 0.36, h, h, h);
        r2.addColorStop(0, 'rgba(0,0,0,0)'); r2.addColorStop(0.82, 'rgba(0,0,0,0)'); r2.addColorStop(1, rim);
        g.fillStyle = r2; g.beginPath(); g.arc(h, h, h, 0, TAU); g.fill();
      }
      for (const p of spots) {
        g.save(); g.translate(p.x * N, p.y * N); g.rotate(p.a || 0); g.scale(1, p.k || 1);
        const r3 = g.createRadialGradient(0, 0, 0, 0, 0, p.r * N);
        r3.addColorStop(0, p.c); r3.addColorStop(p.h || 0.35, p.c); r3.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = r3; g.beginPath(); g.arc(0, 0, p.r * N, 0, TAU); g.fill(); g.restore();
      }
      return c;
    }
    // нормаль-карта ленты: полосы скотча внахлёст + заломы; высота → нормали (Собель), тайлится
    function tapeNormal(N, seed) {
      const c = cv2d(N, N), g = c.getContext('2d', { willReadFrequently: true }), r = rng(seed);
      g.fillStyle = '#808080'; g.fillRect(0, 0, N, N);
      let y = 0;
      while (y < N) {
        const hh = Math.min(N - y, 30 + r() * 38), v = (112 + r() * 36) | 0;
        g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, N, hh);
        g.fillStyle = 'rgb(70,70,70)'; g.fillRect(0, y + hh - 1.5, N, 1.5);
        g.fillStyle = 'rgb(190,190,190)'; g.fillRect(0, y, N, 1);
        y += hh;
      }
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (let k = 0; k < 70; k++) {
        let px = r() * N, py = r() * N, a = r() * TAU; const pts = [[px, py]];
        const segs = 2 + ((r() * 3) | 0), len = 5 + r() * 18;
        for (let j = 0; j < segs; j++) { a += (r() - 0.5) * 1.5; px += Math.cos(a) * len; py += Math.sin(a) * len; pts.push([px, py]); }
        g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.45)'; g.lineWidth = 0.7 + r() * 1.3;
        for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
          g.beginPath(); pts.forEach(([qx, qy], j) => (j ? g.lineTo(qx + ox, qy + oy) : g.moveTo(qx + ox, qy + oy))); g.stroke();
        }
      }
      const src = g.getImageData(0, 0, N, N).data, out = g.createImageData(N, N), d = out.data, S = 2.4;
      const Hh = (x, yy) => src[((((yy + N) % N) * N) + ((x + N) % N)) * 4] / 255;
      for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) {
        const dx = (Hh(xx + 1, yy) - Hh(xx - 1, yy)) * S, dy = (Hh(xx, yy + 1) - Hh(xx, yy - 1)) * S;
        const l = Math.hypot(dx, dy, 1), i4 = (yy * N + xx) * 4;
        d[i4] = (-dx / l * 0.5 + 0.5) * 255; d[i4 + 1] = (dy / l * 0.5 + 0.5) * 255; d[i4 + 2] = (1 / l * 0.5 + 0.5) * 255; d[i4 + 3] = 255;
      }
      g.putImageData(out, 0, 0);
      return c;
    }

    const renderer = new T.WebGLRenderer({
      canvas, antialias: !!o.aa, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: !!o.strict, preserveDrawingBuffer: !!o.keep, stencil: false,
    });
    // программный WebGL (SwiftShader / llvmpipe / Basic Render): компиляция шейдеров замораживает страницу на ~0,9 с → SVG
    try {
      const g = renderer.getContext(), di = g.getExtension('WEBGL_debug_renderer_info');
      const rn = String(di ? g.getParameter(di.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER));
      if (!o.soft && /swiftshader|llvmpipe|softpipe|basic render|software|microsoft basic/i.test(rn)) throw new Error('software-gl: ' + rn);
    } catch (e) { if (/software-gl/.test(e.message)) { renderer.dispose(); throw e; } }
    renderer.setPixelRatio(1);                      // размер буфера в пикселях задаём сами
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.NoToneMapping;

    const C = o.colors;
    const mcFace = new T.CanvasTexture(matcap(256,
      [[0, C.hi], [0.22, C.acid], [0.55, C.green], [0.86, C.deep], [1, C.forest]],
      [{ x: 0.34, y: 0.27, r: 0.15, c: 'rgba(255,255,255,.95)', h: 0.2, k: 0.62, a: -0.5 },
       { x: 0.7, y: 0.74, r: 0.12, c: 'rgba(169,255,1,.35)' }],
      'rgba(0,255,42,.9)'));
    const mcSide = new T.CanvasTexture(matcap(128,
      [[0, '#1d6a22'], [0.5, C.forest], [1, '#020a02']],
      [{ x: 0.36, y: 0.3, r: 0.12, c: 'rgba(120,255,140,.55)', k: 0.7 }],
      'rgba(0,219,36,.55)'));
    mcFace.colorSpace = mcSide.colorSpace = T.SRGBColorSpace;
    const nrm = new T.CanvasTexture(tapeNormal(o.lite ? 128 : 256, 20261009));
    nrm.wrapS = nrm.wrapT = T.RepeatWrapping; nrm.repeat.set(0.62, 0.62);
    const face = new T.MeshMatcapMaterial({ matcap: mcFace, normalMap: nrm, normalScale: new T.Vector2(0.5, 0.5) });
    const side = new T.MeshMatcapMaterial({ matcap: mcSide });

    const ext = (d, depth, bev) => {
      const g = new T.ExtrudeGeometry(shapes(d), {
        depth, curveSegments: o.lite ? 6 : 12, bevelEnabled: true,
        bevelThickness: bev, bevelSize: bev * 0.55, bevelSegments: o.lite ? 1 : 2,
      });
      g.translate(0, 0, -depth / 2);
      return g;
    };
    const gH = ext(o.P_HORNS, 0.15, 0.035), gG = ext(o.P_G, 0.22, 0.038);
    const gcx = o.GC[0] / U, gcy = -o.GC[1] / U;
    gG.translate(-gcx, -gcy, 0);
    const scene = new T.Scene(), group = new T.Group();
    group.rotation.order = 'YXZ';
    const horns = new T.Mesh(gH, [face, side]), needle = new T.Mesh(gG, [face, side]);
    needle.position.set(gcx, gcy, 0.07);
    group.add(horns, needle); scene.add(group);
    // кадр: знак (≈3.02 ед.) = FILL ширины кадра, кадр ASPECT : 1
    const fov = 22, cam = new T.PerspectiveCamera(fov, o.ASPECT, 0.1, 40);
    const halfH = (3.02 / o.FILL / 2) / o.ASPECT;
    cam.position.set(0, 0, halfH / Math.tan(fov * Math.PI / 360)); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();

    let frames = 0, lostCb = null;
    try { canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (lostCb) lostCb(); }, false); } catch (e) { /* нет событий */ }
    function pose(p) {
      group.rotation.set(p.rx || 0, p.ry || 0, -(p.rz || 0));
      group.scale.setScalar(p.s || 1);
      needle.rotation.z = -(p.nd || 0);       // nd — по часовой (как CSS rotate)
    }
    function render(p) { pose(p); renderer.render(scene, cam); frames++; }
    function setRes(w, h) { renderer.setSize(Math.max(2, w | 0), Math.max(2, h | 0), false); }
    async function warm(p) {
      if (renderer.compileAsync) await renderer.compileAsync(scene, cam); else renderer.compile(scene, cam);
      render(p);                                  // первая отрисовка грузит текстуры и буферы — до показа
    }
    function info() { const r = renderer.info.render; return { frames, glFrame: r.frame, calls: r.calls, tris: r.triangles, programs: (renderer.info.programs || []).length }; }
    function dispose() { [gH, gG, face, side, mcFace, mcSide, nrm].forEach((x) => x.dispose()); renderer.dispose(); }
    return { render, setRes, warm, info, dispose, onLost: (f) => { lostCb = f; } };
  }

  // three.module.min.js импортирует НЕминифицированный ./three.core.js (+125 КБ br) — подменяем на three.core.min.js
  const WORKER_SRC = `'use strict';
const ENGINE = ${ENGINE.toString()};
let E = null, last = null, pend = false;
const raf = self.requestAnimationFrame ? (f) => self.requestAnimationFrame(f) : (f) => setTimeout(f, 0);
const draw = () => { pend = false; if (E && last) E.render(last); };
async function load(url) {
  try {
    const src = await (await fetch(url)).text();
    const core = new URL('three.core.min.js', url).href;
    const IMP = 'from"./three.core.js"';
    if (src.indexOf(IMP) < 0) throw 0;
    const blob = new Blob([src.split(IMP).join('from"' + core + '"')], { type: 'text/javascript' });
    return await import(URL.createObjectURL(blob));
  } catch (e) { return import(url); }
}
self.onmessage = async (ev) => {
  const m = ev.data;
  try {
    if (m.t === 'init') {
      const T = await load(m.url);
      E = ENGINE(T, m.canvas, m.o);
      E.onLost(() => postMessage({ t: 'lost' }));
      E.setRes(m.w, m.h); last = m.pose;
      postMessage({ t: 'built' });
    } else if (!E) return;
    else if (m.t === 'warm') { await E.warm(last); postMessage({ t: 'ready' }); }
    else if (m.t === 'pose') { last = m.p; if (!pend) { pend = true; raf(draw); } }
    else if (m.t === 'res') { E.setRes(m.w, m.h); if (last) E.render(last); }
    else if (m.t === 'stats') {
      const v = E.info();
      v.net = performance.getEntriesByType('resource').map((r) => [r.name.split('/').pop(), r.encodedBodySize, r.decodedBodySize]);
      postMessage({ t: 'stats', id: m.id, v });
    }
  } catch (e) { postMessage({ t: 'error', msg: String((e && e.message) || e) }); }
};`;

  /* ═════════════════════ СОСТОЯНИЕ ═════════════════════ */
  const S = {
    mode: 'none',            // 'gl' — 3D (пока шейдеры не готовы, в hero стоит SVG) | 'svg' — фолбэк
    built: false, warmAsked: false, glReady: false, glIn: -1e9,
    started: false, birthT: -1e9,
    sy: 0, vel: 0, px: -1, py: -1,
    up: 0, down: 0, lastScrollT: -1e9, summon: 0, summonV: 0,   // mobile: компаньон только при прокрутке вверх
    yaw: 0, yawV: 0, pitch: 0, drag: null, gyro: null,
    card: null, cardEl: null, compHover: false,
    overlay: false, kb: false, nodT: -1e9, spinT: -1e9,
    jumpT: -1e9, jumpSnap: true, restHide: false, chk: null,
    settled: false, dirty: true, renders: 0, lastPost: null, res: [0, 0], resT: 0,
    carrier: '', pose: null, lastCv: '', lastOp: '',
  };
  const M = {                // замеры (обновляются только в measure)
    vw: 1, vh: 1, dpr: 1, mob: false, docH: 1,
    hero: { cx: 0, cy: 0, w: 300 }, heroTop: 0,
    park: { x: 0, y: 0, size: 48 }, show: true, btn: 48,
    secs: [], logo: null, looks: [], Wc: 300, Hc: 214,
  };
  let stage = null, cv = null, comp = null, compTw = null, host = null, hostSvg = null, gyroBtn = null;
  let glh = null, uid = 0;
  const statsCb = new Map();

  /* ═════════════════════ DOM ═════════════════════ */
  function svgMark(cls) {
    const id = 'g-sv-' + (++uid);
    return `<svg class="g-svg ${cls || ''}" viewBox="${VB}" aria-hidden="true" focusable="false">` +
      `<defs><linearGradient id="${id}" x1="0" y1="0" x2=".55" y2="1"><stop offset="0" stop-color="#5dff72"/>` +
      `<stop offset=".5" stop-color="${tok('--c-green', '#00DB24')}"/><stop offset="1" stop-color="#078a1c"/></linearGradient></defs>` +
      `<g fill="url(#${id})" stroke="${tok('--c-forest', '#10340C')}" stroke-width="6" stroke-linejoin="round" paint-order="stroke">` +
      `<path d="${P_HORNS}"/><g class="g-sv-n"><path d="${P_G}"/></g></g></svg>`;
  }
  function buildStage() {
    stage = D.createElement('div');
    stage.className = 'g-stage';
    comp = D.createElement('button');
    comp.type = 'button'; comp.className = 'g-comp'; comp.setAttribute('aria-label', 'Наверх'); comp.title = 'Наверх';
    compTw = D.createElement('div');
    compTw.className = 'g-tw g-tw--comp'; compTw.setAttribute('aria-hidden', 'true');
    compTw.innerHTML = `<div class="g-tw-in">${svgMark()}</div>`;
    comp.appendChild(compTw);
    stage.appendChild(comp);
    D.body.appendChild(stage);
    comp.addEventListener('click', () => {
      try { W.scrollTo({ top: 0, behavior: RMQ.matches ? 'auto' : 'smooth' }); } catch (e) { W.scrollTo(0, 0); }
    });
    comp.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { S.compHover = true; wake(); } });
    comp.addEventListener('pointerleave', () => { S.compHover = false; wake(); });
  }
  function buildHost() {
    const h = D.getElementById('g3d');
    if (!h || h === host) return;
    host = h;
    const wrap = D.createElement('div');
    wrap.className = 'g-host'; wrap.innerHTML = svgMark('g-svg--host');
    host.appendChild(wrap); hostSvg = wrap;
    host.addEventListener('pointerdown', onDown);
    host.addEventListener('pointermove', onDrag);
    host.addEventListener('pointerup', onUp);
    host.addEventListener('pointercancel', onUp);
    if (S.mode === 'gl' && S.glReady) { host.classList.add('is-gl'); buildGyro(); }
  }
  function buildGyro() {
    if (gyroBtn || !host || FINEQ.matches || !W.DeviceOrientationEvent || RMQ.matches || SHOT || S.mode !== 'gl') return;
    gyroBtn = D.createElement('button');
    gyroBtn.type = 'button'; gyroBtn.className = 'g-gyro';
    gyroBtn.setAttribute('aria-label', 'Наклон: знак следит за наклоном телефона');
    gyroBtn.setAttribute('aria-pressed', 'false');
    gyroBtn.innerHTML = '<span class="g-gyro-i" aria-hidden="true"></span><span>наклон</span>';
    gyroBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (S.gyro) { W.removeEventListener('deviceorientation', onTilt); S.gyro = null; gyroBtn.setAttribute('aria-pressed', 'false'); wake(); return; }
      try {
        const rq = W.DeviceOrientationEvent.requestPermission;
        if (typeof rq === 'function' && (await rq.call(W.DeviceOrientationEvent)) !== 'granted') { gyroBtn.dataset.state = 'denied'; return; }
        S.gyro = { rx: 0, ry: 0 };
        W.addEventListener('deviceorientation', onTilt, { passive: true });
        gyroBtn.setAttribute('aria-pressed', 'true');
      } catch (err) { gyroBtn.dataset.state = 'denied'; }
    });
    host.appendChild(gyroBtn);
    // «наклон» появляется после рождения знака, не раньше
    const show = () => { if (gyroBtn) gyroBtn.classList.add('is-shown'); };
    if (S.started) setTimeout(show, Math.max(0, S.birthT + 750 - now())); else gyroBtn._late = show;
  }

  /* ═════════════════════ ЗАМЕРЫ (только здесь читаем layout) ═════════════════════ */
  const docRect = (el, sy) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top + sy, w: r.width, h: r.height }; };
  function measure() {
    if (!stage) return;
    buildHost();
    const sy = W.scrollY || 0;
    M.vw = R.clientWidth || innerWidth; M.vh = innerHeight; M.docH = R.scrollHeight;
    M.mob = !FINEQ.matches || NARROWQ.matches;
    M.dpr = Math.min(W.devicePixelRatio || 1, 2);
    stage.classList.toggle('is-mob', M.mob);
    // разделы: data-g (контракт), запасной путь — id
    const secs = [];
    const add = (name, el) => { if (el && !secs.some((s) => s.el === el)) { const r = docRect(el, sy); secs.push({ name, el, top: r.t, bot: r.t + r.h }); } };
    D.querySelectorAll('[data-g]').forEach((el) => add(el.dataset.g, el));
    [['hero', '#hero'], ['drop', '#drop'], ['looks', '#looks'], ['sign', '#sign'], ['next', '#next'], ['footer', '#footer']]
      .forEach(([n, s]) => { if (!secs.some((x) => x.name === n)) add(n, D.querySelector(s)); });
    secs.sort((a, b) => a.top - b.top); M.secs = secs;
    const hs = secs.find((s) => s.name === 'hero');
    M.heroTop = hs ? hs.top : 0;
    // hero-кадр: строго прямоугольник #g3d (K3)
    let hb = host && host.getBoundingClientRect();
    if (!hb || hb.width < 24 || hb.height < 24) {
      const w = M.mob ? M.vw * 0.4 : M.vw * 0.3;
      hb = { left: M.vw - w - 16, top: M.heroTop - sy + 60, width: w, height: w };
    }
    const Wc = Math.min(hb.width, hb.height * ASPECT);
    M.hero = { cx: hb.left + hb.width / 2, cy: hb.top + sy + hb.height / 2, w: Wc };
    // компаньон. Desktop: только в правом поле вне контента, размер — по полю; поле < 40 px → не показываем.
    // Mobile: кнопка 48 px в углу (safe-area), знак 36 px на тёмной шайбе.
    if (M.mob) { M.btn = 48; M.show = true; stage.style.removeProperty('--g-right'); }
    else {
      const grid = D.querySelector('#drop [data-grid]') || D.querySelector('#drop .wrap') || D.querySelector('.wrap');
      const gap = grid ? M.vw - grid.getBoundingClientRect().right : 64;
      M.show = gap >= 40;
      M.btn = Math.round(clamp(gap - 12, 24, 96));
      stage.style.setProperty('--g-right', Math.max(2, Math.round((gap - M.btn) / 2)) + 'px');
    }
    stage.style.setProperty('--g-btn', M.btn + 'px');
    M.park = { x: comp.offsetLeft + comp.offsetWidth / 2, y: comp.offsetTop + comp.offsetHeight / 2, size: M.mob ? 36 : M.btn };
    // логотип подвала (K5: #footer-logo > .fo-logo): буква G — bbox 137..347 × 47..240 в 1854×390
    const lg = D.querySelector('#footer-logo .fo-logo') || D.getElementById('footer-logo');
    if (lg) {
      const r = docRect(lg, sy), kx = r.w / LOGO.w, ky = r.h / LOGO.h;
      M.logo = { gx: r.l + 242 * kx, gTop: r.t + 47 * ky, gW: 210 * kx, top: r.t };
    } else M.logo = null;
    // отпечатки «Образов» (контракт: figure.look > .look-print)
    let prints = Array.from(D.querySelectorAll('#looks .look-print'));
    if (!prints.length) prints = Array.from(D.querySelectorAll('#looks .look'));
    M.looks = prints.map((el) => { const r = docRect(el, sy); return { x: r.l + r.w / 2, y: r.t + r.h / 2 }; });
    // канвас: CSS-размер постоянный (hero-кадр), масштаб — transform; буфер меняется отдельно
    const cw = Math.round(Math.max(Wc, 96 / FILL)), ch = Math.round(cw / ASPECT);
    if (cv && (cw !== M.Wc || ch !== M.Hc)) { cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; S.res = [0, 0]; S.lastCv = ''; }
    M.Wc = cw; M.Hc = ch;
    S.settled = false; S.restHide = false;
    wake();
  }
  let mT = 0;
  const remeasure = () => { if (mT) return; mT = requestAnimationFrame(() => { mT = 0; measure(); }); };

  /* ═════════════════════ ВВОД ═════════════════════ */
  function onPointer(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    S.px = e.clientX; S.py = e.clientY; wake();
  }
  function onOver(e) {
    if (!FINEQ.matches) return;
    const c = e.target && e.target.closest ? e.target.closest('#drop .card') : null;
    if (c === S.cardEl) return;
    S.cardEl = c;
    if (c) { const r = c.getBoundingClientRect(); S.card = { x: r.left + r.width / 2, y: r.top + (W.scrollY || 0) + r.height / 2 }; }
    else S.card = null;
    wake();
  }
  function onDown(e) {
    if (S.mode !== 'gl' || !S.glReady || heroP() > 0.15) return;
    if (e.button) return;
    if (gyroBtn && gyroBtn.contains(e.target)) return;
    S.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: now() }; S.yawV = 0;
    try { host.setPointerCapture(e.pointerId); } catch (er) { /* noop */ }
    wake();
  }
  function onDrag(e) {
    const d = S.drag; if (!d || d.id !== e.pointerId) return;
    const t = now(), dx = e.clientX - d.x, dy = e.clientY - d.y, dt = Math.max(8, t - d.t) / 1000;
    d.x = e.clientX; d.y = e.clientY; d.t = t;
    S.yaw += dx * 0.011; S.yawV = damp(S.yawV, dx * 0.011 / dt, 18, dt);
    if (e.pointerType === 'mouse') S.pitch = clamp(S.pitch + dy * 0.004, -0.35, 0.35);
    wake();
  }
  function onUp(e) { if (S.drag && S.drag.id === e.pointerId) { S.drag = null; wake(); } }
  function onTilt(e) {
    if (e.beta == null || !S.gyro) return;
    // квантуем: дрожь руки не должна держать рендер включённым
    const rx = Math.round(clamp((e.beta - 45) / 40, -1, 1) * 0.32 * 50) / 50;
    const ry = Math.round(clamp(e.gamma / 35, -1, 1) * 0.55 * 50) / 50;
    if (rx !== S.gyro.rx || ry !== S.gyro.ry) { S.gyro.rx = rx; S.gyro.ry = ry; wake(); }
  }
  // экранная клавиатура (mobile): компаньон прячется
  function kbCheck() {
    const a = D.activeElement, vv = W.visualViewport;
    const field = !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !/^(radio|checkbox|button|submit)$/i.test(a.type || ''));
    const k = M.mob && (field || !!(vv && vv.height < innerHeight * 0.78));
    if (k !== S.kb) { S.kb = k; wake(); }
  }

  /* ═════════════════════ РЕЖИССЁР: поза-цель как чистая функция прокрутки и ввода ═════════════════════ */
  const heroK = () => M.vh * (M.mob ? 0.45 : 0.6);
  const heroP = () => clamp(((W.scrollY || 0) - M.heroTop) / heroK(), 0, 1);
  function section(sy) {
    const y = sy + M.vh * 0.5; let name = '';
    for (const s of M.secs) if (y >= s.top && y < s.bot) name = s.name;
    return name;
  }
  // повернуться «лицом» к точке экрана от центра знака (x, y)
  function lookAt(T, x, y, px, py, w) {
    const dx = px - x, dy = py - y;
    T.ry += clamp(dx / (M.vw * 0.5), -1, 1) * 0.55 * w;
    T.rx += clamp(dy / (M.vh * 0.5), -1, 1) * 0.3 * w;
    // стрелка доворачивает к цели не больше ±14°, знак не ломается
    const a = Math.atan2(dy, dx) + Math.PI / 4;
    T.nd += clamp(Math.atan2(Math.sin(a), Math.cos(a)) * 0.18, -0.25, 0.25) * w;
  }
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  function target(sy) {
    const hp = clamp((sy - M.heroTop) / heroK(), 0, 1), e = eio(hp);
    const H = M.hero, P = M.park, heroMark = H.w * FILL;
    const live = !RMQ.matches && !SHOT;
    // mobile: сначала прижимается к правому краю и уменьшается, потом спускается в угол — путь не пересекает заголовок
    const ex = M.mob ? eo3(hp) : e;
    const parkX = M.mob || M.show ? P.x : M.vw + P.size;      // поля нет — знак уходит за правый край
    const T = {
      x: lerp(H.cx, parkX, ex),
      y: lerp(H.cy - sy * 0.5, P.y, e),         // в начале — полпараллакса за hero, дальше к парковке
      size: Math.exp(lerp(Math.log(heroMark), Math.log(P.size), ex)),
      rx: NEUTRAL.rx, ry: NEUTRAL.ry, rz: 0, nd: 0, s: 1, op: 1, foot: 0, hide: 0,
    };
    // где знак может стоять вне hero: desktop — в поле (если оно есть), mobile — только когда позвали прокруткой вверх
    const parkVis = M.mob ? S.summonV : (M.show ? 1 : 0);
    T.op = lerp(1, parkVis, e);
    const wHero = live ? 1 - eio(clamp(hp / 0.35, 0, 1)) : 0, wPark = live ? clamp((hp - 0.6) / 0.4, 0, 1) : 0;
    if (wHero > 0) {
      if (FINEQ.matches && S.px >= 0) lookAt(T, H.cx, H.cy - sy, S.px, S.py, wHero);
      if (S.gyro) { T.rx += S.gyro.rx * wHero; T.ry += S.gyro.ry * wHero; }
      T.ry += S.yaw * wHero; T.rx += S.pitch * wHero;
    }
    const sec = section(sy);
    if (wPark > 0) {
      if (!M.mob) {               // desktop: наклон по скорости прокрутки (mobile — без, чтобы не рендерить на каждом кадре)
        const k = clamp(S.vel / 2400, -1, 1);
        T.nd += k * 0.45 * wPark; T.rx += k * 0.22 * wPark; T.rz += k * 0.06 * wPark;
        if (sec === 'drop' && S.card && FINEQ.matches) lookAt(T, P.x, P.y, S.card.x, S.card.y - sy, wPark);
      }
      if (sec === 'looks' && M.looks.length) {
        let best = null, bd = 1e9;
        for (const L of M.looks) { const d = Math.hypot(L.y - sy - M.vh * 0.5, (L.x - M.vw * 0.5) * 0.5); if (d < bd) { bd = d; best = L; } }
        if (best && bd < M.vh * 0.6) lookAt(T, P.x, P.y, best.x, best.y - sy, wPark);
      }
      if (S.compHover) T.nd = -Math.PI / 4;     // наведение на компаньона: стрелка смотрит вверх — «наверх»
    }
    if ((sec === 'sign' && hp >= 1) || S.overlay || S.kb) T.hide = 1;
    // подвал: летит к букве G логотипа и растворяется ДО касания букв (рога не ложатся на лого)
    if (M.logo && hp >= 1) {
      const maxS = Math.max(1, M.docH - M.vh);
      const end = Math.min(M.logo.gTop - M.vh * 0.62, maxS - 2), start = end - M.vh * 0.9;   // длинный участок — полёт не быстрее прокрутки
      const fp = clamp((sy - start) / Math.max(1, end - start), 0, 1);
      if (fp > 0) {
        if (!live || S.mode !== 'gl') T.op *= 1 - smooth(fp / 0.3);      // фолбэк: компаньон просто гаснет
        else {
          const f = eio(fp), top = M.logo.gTop - sy, sz = M.logo.gW * (MARK_W / 154) * 0.5;
          T.x = lerp(T.x, M.logo.gx, f); T.size = lerp(T.size, sz, f);
          T.y = lerp(T.y, top - sz * 0.34 - 12, f);
          const nw = eio(clamp(fp / 0.5, 0, 1));
          T.rx = lerp(T.rx, NEUTRAL.rx, nw); T.ry = lerp(T.ry, NEUTRAL.ry, nw); T.nd *= 1 - nw; T.rz *= 1 - nw;
          let op = Math.max(T.op, smooth(fp / 0.12)) * (1 - smooth((fp - 0.4) / 0.42));
          const gap = top - (T.y + T.size * 0.34);                         // от низа знака до верха букв
          op *= clamp(gap / (T.size * 0.3), 0, 1);
          T.op = op; T.foot = fp; T.hide = 0;
        }
      }
    }
    // mobile: путь не уходит за нижний край экрана
    if (M.mob) T.y = Math.min(T.y, M.vh - T.size * 0.34 - 10);
    if (T.hide) { T.op = 0; if (live && !M.mob) T.x = M.vw + T.size; }
    if (S.restHide) T.op = 0;
    return T;
  }

  /* ═════════════════════ ЦИКЛ ═════════════════════ */
  let rafId = 0, lastT = 0;
  const useTicker = () => !!(W.gsap && W.gsap.ticker);
  function wake() {
    S.dirty = true;
    if (!S.started || S.ticker || rafId) return;
    rafId = requestAnimationFrame((t) => { rafId = 0; const d = lastT ? t - lastT : 16.7; lastT = t; tick(t, d); if (!S.settled) wake(); });
  }
  function tick(time, dtMs) {
    if (!S.started || !stage) return;
    const t = now();
    const dt = clamp((dtMs || 16.7) / 1000, 0.001, 0.05);
    const sy = W.scrollY || 0;
    const still = RMQ.matches || SHOT;
    let raw = 0;
    if (sy !== S.sy) {
      const dy = sy - S.sy;
      // скачок (End/Home, якорь, перетаскивание полосы): не телепортируемся — гасим, переносим, проявляем
      if (Math.abs(dy) > M.vh * 0.5 && S.pose && !still) { S.jumpT = t; S.jumpSnap = false; }
      else raw = dy / dt;
      if (dy < 0) { S.up += -dy; S.down = 0; if (S.up > 24) S.summon = 1; }
      else { S.down += dy; S.up = 0; if (S.down > 24) S.summon = 0; }
      S.sy = sy; S.lastScrollT = t; S.restHide = false; S.dirty = true;
    }
    if (S.summon && t - S.lastScrollT > 1500) S.summon = 0;
    if (S.overlay || S.kb || sy <= M.heroTop + 4) S.summon = 0;
    const jt = t - S.jumpT;
    const anim = t - S.birthT < 760 || t - S.nodT < 1300 || (t - S.spinT < 1200 && t > S.spinT - 200) || !!S.drag ||
      Math.abs(S.yawV) > 0.01 || t - S.glIn < 400 || jt < 260 || Math.abs(S.summonV - S.summon) > 0.003 ||
      (S.summon && t - S.lastScrollT < 1600);
    if (!S.dirty && S.settled && !anim && S.vel === 0) return;   // покой — ноль работы
    S.vel = damp(S.vel, clamp(raw, -9000, 9000), raw ? 10 : 7, dt);
    if (Math.abs(S.vel) < 4 && !raw) S.vel = 0;
    S.summonV = still ? S.summon : damp(S.summonV, S.summon, 16, dt);
    if (Math.abs(S.summonV - S.summon) < 0.003) S.summonV = S.summon;
    // инерция свайпа и пружина «домой»
    if (!S.drag) {
      S.yaw += S.yawV * dt; S.yawV = damp(S.yawV, 0, 3.2, dt);
      if (Math.abs(S.yawV) < 0.6) { const home = Math.round(S.yaw / TAU) * TAU; S.yaw = damp(S.yaw, home, 4, dt); }
      S.pitch = damp(S.pitch, 0, 3, dt);
      if (Math.abs(S.yaw - Math.round(S.yaw / TAU) * TAU) < 0.002 && Math.abs(S.yawV) < 0.05) { S.yaw = 0; S.yawV = 0; }
      if (Math.abs(S.pitch) < 0.001) S.pitch = 0;
    }
    const T = target(sy);
    // прокрутка остановилась (140 мс тишины) — сразу проверяем, не встанет ли знак на контент
    if (!S.restHide && S.chk !== S.lastScrollT && t - S.lastScrollT > 140) { S.chk = S.lastScrollT; restCheck(T); }
    let P = S.pose;
    const fresh = !P;
    if (fresh) P = S.pose = Object.assign({}, T);
    let jm = 1;
    if (jt < 90) jm = 1 - jt / 90;                                 // гаснет на месте
    else if (jt < 240) { if (!S.jumpSnap) { Object.assign(P, T); S.jumpSnap = true; } jm = (jt - 90) / 150; }
    if (jt >= 90 || jt < 0) {
      const lp = T.hide ? 9 : T.foot ? 10 : 16, lr = 7;
      for (const k of ['x', 'y', 'size']) P[k] = still ? T[k] : damp(P[k], T[k], lp, dt);
      for (const k of ['rx', 'ry', 'rz', 'nd']) P[k] = still ? T[k] : damp(P[k], T[k], lr, dt);
      P.op = still ? T.op : damp(P.op, T.op, 14, dt);
      P.foot = T.foot; P.hide = T.hide;
    }
    P.s = 1;
    // одноразовые жесты — поверх сглаженной позы
    const V = Object.assign({}, P);
    V.op *= jm;
    const tb = (t - S.birthT) / 700;                                // рождение на месте: 0,6 → 1, поворот, проявление
    if (tb >= 0 && tb < 1) {
      const k = eo3(tb);
      V.size = P.size * (0.6 + 0.4 * k); V.ry = P.ry - 1.25 * (1 - k); V.rx = P.rx + 0.25 * (1 - k);
      V.op *= clamp(tb / 0.45, 0, 1);
    }
    const tn = (t - S.nodT) / 1000;
    if (tn >= 0 && tn < 1.3) { const a = Math.exp(-4.5 * tn) * Math.sin(tn * 15); V.rx += 0.34 * a; V.s = 1 + 0.05 * Math.max(0, a); }
    const ts = (t - S.spinT) / 1100;
    if (ts >= 0 && ts < 1) { V.ry += TAU * eo3(ts); V.s *= 1 + 0.1 * Math.sin(ts * Math.PI); }
    apply(V, t);
    // устоялось?
    const eps = Math.abs(P.x - T.x) + Math.abs(P.y - T.y) + Math.abs(P.size - T.size);
    const epr = Math.abs(P.rx - T.rx) + Math.abs(P.ry - T.ry) + Math.abs(P.rz - T.rz) + Math.abs(P.nd - T.nd);
    const was = S.settled;
    S.settled = eps < 0.25 && epr < 0.0015 && Math.abs(P.op - T.op) < 0.004 && !anim && S.vel === 0;
    if (S.settled) { Object.assign(P, T); apply(P, t); if (!was) restCheck(P); }
    S.dirty = false;
  }

  // остановились — знак не должен лежать на тексте, кнопке, цене, поле, фото вещи, логотипе
  const CONTENT = 'a,button,input,textarea,select,label,summary,h1,h2,h3,h4,h5,p,li,dt,dd,figcaption,td,th,img,video,svg,.fo-logo,[role="img"]';
  function isContent(el) {
    if (stage.contains(el) || (host && host.contains(el))) return false;
    if (el.matches(CONTENT)) return !(el.matches('img,svg') && el.closest('[aria-hidden="true"]')) || el.closest('.fo-logo');
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return true;
    return false;
  }
  function overlaps(r) {
    for (const fx of [0.2, 0.5, 0.8]) for (const fy of [0.25, 0.5, 0.75]) {
      const x = r.l + r.w * fx, y = r.t + r.h * fy;
      if (x < 0 || y < 0 || x > M.vw || y > M.vh) continue;
      for (const el of D.elementsFromPoint(x, y)) {
        if (el === D.body || el === R) break;
        if (isContent(el)) return el;
      }
    }
    return null;
  }
  function restCheck(P) {
    if (S.restHide || P.op < 0.05 || P.hide || heroP() < 0.95 || !stage) return;
    const w = Math.max(P.size, M.mob ? M.btn : 0), h = Math.max(P.size * 0.68, M.mob ? M.btn : 0);
    const hit = overlaps({ l: P.x - w / 2, t: P.y - h / 2, w, h });
    if (hit) { S.restHide = true; S.settled = false; S.lastHit = hit; wake(); }
  }

  /* какой носитель показывает знак: gl (канвас) | host (SVG в hero) | comp (SVG-компаньон, фолбэк) */
  function carrierFor(P) {
    if (S.mode === 'gl' && S.glReady) return 'gl';
    if (heroP() < 0.5 && !P.hide) return 'host';
    return 'comp';
  }
  function setCarrier(c) {
    if (c === S.carrier) return;
    S.carrier = c;
    stage.dataset.carrier = c;
    if (hostSvg) hostSvg.classList.toggle('is-on', c === 'host');
    comp.classList.toggle('is-vis', c === 'comp');
    if (cv) cv.classList.toggle('is-on', c === 'gl');
    S.lastPost = null; S.lastCv = ''; S.lastOp = '';
  }
  const f2 = (v) => Math.round(v * 100) / 100;
  function apply(V, t) {
    const c = carrierFor(V);
    setCarrier(c);
    const hp = heroP(), vis = V.op > 0.01;
    const hid = !vis && c !== 'host';
    if (stage.classList.contains('is-hidden') !== hid) stage.classList.toggle('is-hidden', hid);
    // компаньон-кнопка «наверх» стоит на месте; живая, когда знак припаркован и виден
    const parked = hp >= 0.95 && !V.foot && !V.hide;
    const live = parked && V.op > 0.5 && (M.mob || M.show);
    if (comp.classList.contains('is-live') !== live) comp.classList.toggle('is-live', live);
    const cop = (parked ? V.op : 0).toFixed(3);
    if (comp._o !== cop) { comp._o = cop; comp.style.setProperty('--cop', cop); }
    if (c === 'comp') twinPose(compTw, V);
    if (c === 'gl' && cv && glh) {
      const glOp = V.op * clamp((t - S.glIn) / 300, 0, 1);
      const s = V.size / (M.Wc * FILL);
      const tr = `translate3d(${f2(V.x - M.Wc / 2)}px,${f2(V.y - M.Hc / 2)}px,0) scale(${s.toFixed(4)})`;
      if (tr !== S.lastCv) { cv.style.transform = tr; S.lastCv = tr; }
      const o = glOp.toFixed(3); if (o !== S.lastOp) { cv.style.opacity = o; S.lastOp = o; }
      // SVG в hero гаснет, пока проявляется 3D (если шейдеры догрузились после рождения)
      if (hostSvg) {
        const x = t - S.glIn < 320 && hp < 0.5 ? (1 - glOp / Math.max(0.01, V.op)).toFixed(3) : '';
        if (hostSvg._o !== x) { hostSvg._o = x; hostSvg.style.opacity = x; hostSvg.classList.toggle('is-on', x !== ''); }
      }
      // разрешение буфера — ступенями ×2^¼ под видимый размер
      const need = (V.size / FILL) * M.dpr, cap = M.Wc * M.dpr;
      const bw = Math.round(Math.min(cap, Math.pow(2, Math.ceil(Math.log2(Math.max(32, need)) * 4) / 4)));
      if (bw !== S.res[0] && (bw > S.res[0] || S.settled || t - S.resT > 250)) {
        S.res = [bw, Math.round(bw / ASPECT)]; S.resT = t;
        glh.res(S.res[0], S.res[1]); S.lastPost = null;
      }
      // рендер — только если изменился поворот (позиция/масштаб/прозрачность — CSS)
      const p = { rx: +V.rx.toFixed(4), ry: +V.ry.toFixed(4), rz: +V.rz.toFixed(4), nd: +V.nd.toFixed(4), s: +(V.s || 1).toFixed(4) };
      const L = S.lastPost;
      if (vis && (!L || Math.abs(L.rx - p.rx) + Math.abs(L.ry - p.ry) + Math.abs(L.rz - p.rz) + Math.abs(L.nd - p.nd) + Math.abs(L.s - p.s) > 0.0008)) {
        glh.pose(p); S.lastPost = p; S.renders++;
      }
    }
  }
  function twinPose(el, V) {
    const inn = el.firstChild;
    const nd = (RMQ.matches || SHOT) ? '0' : (V.nd * 57.2958).toFixed(1);
    if (inn._nd !== nd) {
      inn._nd = nd;
      const g = inn.querySelector('.g-sv-n'); if (g) g.setAttribute('transform', `rotate(${nd} ${GC[0]} ${GC[1]})`);
    }
  }

  /* ═════════════════════ WebGL: воркер или главный поток ═════════════════════ */
  function weakDevice() {
    const n = navigator, c = n.connection;
    return !!((c && c.saveData) || (n.deviceMemory && n.deviceMemory <= 2) || (n.hardwareConcurrency && n.hardwareConcurrency <= 2));
  }
  function engineOpts() {
    const lite = !FINEQ.matches || NARROWQ.matches;
    return {
      lite, aa: M.dpr < 2, strict: !SHOT, keep: SHOT, soft: Q.has('soft'), FILL, ASPECT, P_HORNS, P_G, GC,
      colors: { hi: '#e9ffd9', acid: tok('--c-acid', '#00FF2A'), green: tok('--c-green', '#00DB24'), deep: '#07791a', forest: tok('--c-forest', '#10340C') },
    };
  }
  function makeCanvas() {
    cv = D.createElement('canvas');
    cv.className = 'g-cv'; cv.setAttribute('aria-hidden', 'true');
    cv.style.width = M.Wc + 'px'; cv.style.height = M.Hc + 'px';
    stage.appendChild(cv);                     // поверх шайбы компаньона; клики проходят к кнопке
    return cv;
  }
  const initPose = () => ({ rx: NEUTRAL.rx, ry: NEUTRAL.ry, rz: 0, nd: 0, s: 1 });
  const idle = (f, to) => (W.requestIdleCallback ? W.requestIdleCallback(f, { timeout: to || 1500 }) : setTimeout(f, 120));
  // компиляция шейдеров: desktop — сразу (на GPU это 0 провалов), mobile — после рождения в простое,
  // пока в hero стоит SVG-знак: прелоадер G не ждёт, подмена — перекрёстным затуханием
  function maybeWarm() {
    if (!S.built || S.warmAsked || S.mode !== 'gl' || !glh) return;
    if (!M.mob || SHOT) { S.warmAsked = true; glh.warm(); return; }
    if (!S.started) return;
    S.warmAsked = true;
    setTimeout(() => idle(() => glh && glh.warm(), 2000), Math.max(0, S.birthT + 900 - now()));
  }
  function onBuilt() { S.built = true; maybeWarm(); }
  function onGLReady() {
    if (S.mode !== 'gl') return;
    S.glReady = true; S.glIn = S.started && !SHOT ? now() : -1e9; S.lastPost = null; S.res = [0, 0]; S.carrier = '';
    stage.dataset.mode = 'gl'; GV.g.mode = 'gl'; GV.g.engine = glh && glh.kind;
    if (host) host.classList.add('is-gl');
    buildGyro(); wake();
  }
  function toSVG(why) {
    if (S.mode === 'svg') return;
    S.mode = 'svg'; S.glReady = false; GV.g.mode = 'svg'; GV.g.why = why || '';
    if (stage) stage.dataset.mode = 'svg';
    if (glh) { try { glh.kill(); } catch (e) { /* noop */ } glh = null; }
    if (cv) { cv.remove(); cv = null; }
    if (gyroBtn) { gyroBtn.remove(); gyroBtn = null; }
    if (host) host.classList.remove('is-gl');
    S.carrier = ''; wake();
  }
  function startGL() {
    const o = engineOpts(), p0 = initPose();
    makeCanvas();
    const w0 = Math.round(M.Wc * M.dpr), h0 = Math.round(w0 / ASPECT);
    S.res = [w0, h0];
    const canWorker = !Q.has('glmain') && typeof Worker !== 'undefined' && !!cv.transferControlToOffscreen && typeof OffscreenCanvas !== 'undefined';
    if (canWorker) {
      let wk = null;
      try {
        const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
        wk = new Worker(url, { type: 'module' });
        const off = cv.transferControlToOffscreen();
        wk.onmessage = (ev) => {
          const m = ev.data;
          if (m.t === 'built') onBuilt();
          else if (m.t === 'ready') onGLReady();
          else if (m.t === 'stats') { const cb = statsCb.get(m.id); if (cb) { statsCb.delete(m.id); cb(m.v); } }
          else if (m.t === 'error' || m.t === 'lost') toSVG(m.msg || m.t);
        };
        wk.onerror = () => toSVG('worker');
        glh = {
          kind: 'worker',
          warm: () => wk.postMessage({ t: 'warm' }),
          pose: (p) => wk.postMessage({ t: 'pose', p }),
          res: (w, h) => wk.postMessage({ t: 'res', w, h }),
          stats: () => new Promise((res) => { const id = ++uid; statsCb.set(id, res); wk.postMessage({ t: 'stats', id }); setTimeout(() => res(null), 1500); }),
          kill: () => wk.terminate(),
        };
        wk.postMessage({ t: 'init', url: URL3, canvas: off, o, w: w0, h: h0, pose: p0 }, [off]);
        return;
      } catch (e) { if (wk) wk.terminate(); glh = null; cv.remove(); makeCanvas(); }
    }
    // главный поток (нет OffscreenCanvas-WebGL): всё тяжёлое — в простое
    import(URL3).then((T) => new Promise((res, rej) => idle(() => {
      try {
        const E = ENGINE(T, cv, o);
        E.onLost(() => toSVG('lost'));
        E.setRes(w0, h0);
        glh = {
          kind: 'main',
          warm: () => idle(() => E.warm(p0).then(onGLReady, (er) => toSVG('warm: ' + er))),
          pose: (p) => E.render(p), res: (w, h) => { E.setRes(w, h); if (S.lastPost) E.render(S.lastPost); },
          stats: () => Promise.resolve(E.info()), kill: () => E.dispose(),
        };
        res();
      } catch (e) { rej(e); }
    }, 2500))).then(onBuilt).catch((e) => toSVG('import: ' + ((e && e.message) || e)));
  }

  /* ═════════════════════ СОБЫТИЯ И ЖИЗНЕННЫЙ ЦИКЛ ═════════════════════ */
  function begin() {
    if (S.started || !stage) return;
    S.started = true;
    measure();
    if (!RMQ.matches && !SHOT) {
      S.birthT = now();
      if (hostSvg && !S.glReady) hostSvg.classList.add('is-born');      // SVG рождается на месте, 3D проявится поверх
    }
    S.glIn = -1e9;
    stage.classList.add('is-started');
    S.ticker = useTicker();                  // GSAP (K1 подключает в конце body, до этого файла) — один общий тикер
    if (S.ticker) W.gsap.ticker.add(tick);
    if (gyroBtn && gyroBtn._late) setTimeout(gyroBtn._late, 750);
    maybeWarm();
    wake();
  }
  function boot() {
    if (stage) return;
    S.overlay = R.hasAttribute('data-overlay');
    const wantGL = !RMQ.matches && !weakDevice() && !Q.has('nogl');
    S.mode = wantGL ? 'gl' : 'svg';
    buildStage(); buildHost();
    stage.dataset.mode = S.mode; GV.g.mode = S.mode;
    measure();
    if (wantGL) startGL();
    W.addEventListener('scroll', wake, { passive: true });
    W.addEventListener('pointermove', onPointer, { passive: true });
    D.addEventListener('pointerover', onOver, { passive: true });
    W.addEventListener('resize', () => { remeasure(); kbCheck(); }, { passive: true });
    if (W.visualViewport) W.visualViewport.addEventListener('resize', kbCheck, { passive: true });
    D.addEventListener('focusin', kbCheck); D.addEventListener('focusout', () => setTimeout(kbCheck, 60));
    W.addEventListener('load', remeasure);
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(remeasure);
    if (W.ResizeObserver) new ResizeObserver(remeasure).observe(D.body);
    if (W.ScrollTrigger && W.ScrollTrigger.addEventListener) W.ScrollTrigger.addEventListener('refresh', remeasure);
    const lw = D.querySelector('#looks [data-looks]');
    if (lw) lw.addEventListener('scroll', remeasure, { passive: true });
    if (W.MutationObserver) {
      new MutationObserver(() => { const o = R.hasAttribute('data-overlay'); if (o !== S.overlay) { S.overlay = o; wake(); } })
        .observe(R, { attributes: true, attributeFilter: ['data-overlay'] });
      // разметку соседей дорисовывают позже (карточки, образы, подвал) — перемеряем пачкой
      let mo = 0;
      new MutationObserver((list) => {
        if (mo || list.every((m) => stage.contains(m.target) || (host && host.contains(m.target)))) return;
        mo = setTimeout(() => { mo = 0; remeasure(); }, 200);
      }).observe(D.body, { childList: true, subtree: true });
    }
    const ld = R.getAttribute('data-loader');
    if (SHOT || ld === 'off' || ld === 'done') begin();
    setTimeout(begin, 6000);                 // лоадер не прислал ready — не ждём вечно
  }

  D.addEventListener('grinchin:ready', () => { if (!stage) boot(); begin(); });
  D.addEventListener('grinchin:overlay', (e) => { const d = e.detail || {}; S.overlay = !!d.open || R.hasAttribute('data-overlay'); wake(); });
  D.addEventListener('grinchin:add', () => { if (!RMQ.matches) { S.nodT = now(); wake(); } });
  // K5 шлёт subscribe в начале показа пакета — оборот чуть позже, на «посадке» ленты
  D.addEventListener('grinchin:subscribe', () => { if (!RMQ.matches) { S.spinT = now() + 150; wake(); } });
  if (RMQ.addEventListener) RMQ.addEventListener('change', () => { if (RMQ.matches) toSVG('reduced-motion'); wake(); });
  D.addEventListener('visibilitychange', () => { if (!D.hidden) wake(); });

  GV.g = {
    v: 2, mode: 'none', state: S, metrics: M,
    renders: () => S.renders,                         // сколько WebGL-кадров запрошено за сессию
    stats: () => (glh && glh.stats ? glh.stats() : Promise.resolve(null)),
    refresh: remeasure,
    nod: () => { S.nodT = now(); wake(); },
    spin: () => { S.spinT = now(); wake(); },
  };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
