/* GRINCHIN v2 · K2 · сквозной объект «G в рогах» → window.GV.g
   Один объект ведёт через весь сайт: рождается из улыбки прелоадера → hero (следит за курсором /
   свайпом / наклоном) → при прокрутке уменьшается и паркуется компаньоном у правого края →
   над «Дропом» смотрит на карточку под курсором → в «Образах» поворачивается к отпечатку в центре →
   в «Знаке» уступает сцену и прячется → на подписку делает оборот → в подвале садится в букву G
   логотипа на мятой бумаге и растворяется. Открыт оверлей — уходит за край.

   Техника (причины рывков v1 — audit/04 §2.3):
   · three.js рендерит в Web Worker через OffscreenCanvas: импорт, геометрия, текстуры и компиляция
     шейдеров не трогают главный поток вообще. Нет OffscreenCanvas-WebGL — тот же движок на главном
     потоке в requestIdleCallback (старые Safari).
   · Канвас один, фиксированный, размером с hero-кадр; двигается и масштабируется только CSS-transform
     (композитор). WebGL перерисовывает кадр, лишь когда меняется поворот; в покое — 0 кадров.
   · Один цикл — gsap.ticker; сглаживание по dt: x += (t−x)·(1−e^(−λ·dt)) — одинаково на 30/60/120 Гц.
   · Чтений layout в цикле нет: прямоугольники меряются в measure() (load / resize / ResizeObserver /
     ScrollTrigger.refresh), в кадре — только scrollY и арифметика.
   · Там, где знак «прилипает» к прокручиваемому контенту (подвал), вместо канваса — двойник-картинка
     внутри самого контента: прокрутка двигает её нативно, отставания от страницы нет.
   · Mobile: WebGL только в hero; дальше компаньон 48 px — двойник (снимок того же 3D-знака, рога и
     G отдельно, чтобы стрелка поворачивалась CSS-ом), кнопка «наверх».
   · Фолбэк (нет WebGL, ошибка импорта, слабое устройство, reduced-motion): SVG-знак того же контура,
     статичный в hero, компаньон без движения за прокруткой.
   Контуры — оригинальный вектор из PDF (стр. 14), тот же, что в svg/g-horns.svg.
   Отладка: ?nogl — сразу SVG-фолбэк; ?glmain — WebGL на главном потоке (без воркера). */
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
  // буква G в логотипе (svg/logo.svg, 1854×390): bbox 137..347 × 47..240 → центр знака и его ширина в ед. лого
  const LOGO = { w: 1854, h: 390, cx: 242.3, cy: 174.2, mark: 533 };
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
    // двойник: рога и G отдельными картинками той же позы и того же кадра (суперсэмплинг ×2)
    async function snap(Wpx, p) {
      const Hpx = Math.round(Wpx / o.ASPECT), SW = Wpx * 2, SH = Hpx * 2;
      const rt = new T.WebGLRenderTarget(SW, SH); rt.texture.colorSpace = T.SRGBColorSpace;
      const buf = new Uint8Array(SW * SH * 4), out = {};
      pose(p);
      for (const part of ['horns', 'needle']) {
        horns.visible = part === 'horns'; needle.visible = part === 'needle';
        renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam);
        renderer.readRenderTargetPixels(rt, 0, 0, SW, SH, buf);
        const big = cv2d(SW, SH), bg = big.getContext('2d'), id = bg.createImageData(SW, SH), row = SW * 4;
        for (let y = 0; y < SH; y++) id.data.set(buf.subarray((SH - 1 - y) * row, (SH - y) * row), y * row);
        bg.putImageData(id, 0, 0);
        const sm = cv2d(Wpx, Hpx), sg = sm.getContext('2d');
        sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = 'high'; sg.drawImage(big, 0, 0, Wpx, Hpx);
        out[part] = sm.convertToBlob ? await sm.convertToBlob({ type: 'image/webp', quality: 0.9 })
          : await new Promise((res) => sm.toBlob(res, 'image/webp', 0.9));
      }
      horns.visible = needle.visible = true;
      renderer.setRenderTarget(null); rt.dispose();
      const v = new T.Vector3(gcx, gcy, 0.07); group.updateMatrixWorld(true); v.applyMatrix4(group.matrixWorld).project(cam);
      out.pivot = [(v.x + 1) / 2, (1 - v.y) / 2];
      return out;
    }
    function info() { const r = renderer.info.render; return { frames, glFrame: r.frame, calls: r.calls, tris: r.triangles, programs: (renderer.info.programs || []).length }; }
    function dispose() { [gH, gG, face, side, mcFace, mcSide, nrm].forEach((x) => x.dispose()); renderer.dispose(); }
    return { render, setRes, warm, snap, info, dispose, onLost: (f) => { lostCb = f; } };
  }

  const WORKER_SRC = `'use strict';
const ENGINE = ${ENGINE.toString()};
let E = null, last = null, pend = false;
const raf = self.requestAnimationFrame ? (f) => self.requestAnimationFrame(f) : (f) => setTimeout(f, 0);
const draw = () => { pend = false; if (E && last) E.render(last); };
self.onmessage = async (ev) => {
  const m = ev.data;
  try {
    if (m.t === 'init') {
      const T = await import(m.url);
      E = ENGINE(T, m.canvas, m.o);
      E.onLost(() => postMessage({ t: 'lost' }));
      E.setRes(m.w, m.h); last = m.pose;
      await E.warm(m.pose);
      postMessage({ t: 'ready' });
      if (m.snap) { const s = await E.snap(m.snap, m.pose); E.render(last); postMessage({ t: 'twin', s }); }
    } else if (!E) return;
    else if (m.t === 'pose') { last = m.p; if (!pend) { pend = true; raf(draw); } }
    else if (m.t === 'res') { E.setRes(m.w, m.h); if (last) E.render(last); }
    else if (m.t === 'stats') postMessage({ t: 'stats', id: m.id, v: E.info() });
  } catch (e) { postMessage({ t: 'error', msg: String((e && e.message) || e) }); }
};`;

  /* ═════════════════════ СОСТОЯНИЕ ═════════════════════ */
  const S = {
    mode: 'none',            // 'gl' — 3D (до готовности показывается SVG) | 'svg' — фолбэк
    glReady: false, twinReady: false, glIn: 0,
    started: false, birthT: -1e9, origin: null,
    sy: 0, vel: 0, px: -1, py: -1,
    yaw: 0, yawV: 0, pitch: 0, drag: null, gyro: null,
    card: null, cardEl: null, compHover: false,
    overlay: false, nodT: -1e9, spinT: -1e9,
    settled: false, dirty: true, renders: 0, lastPost: null, res: [0, 0], resT: 0,
    carrier: '', pose: null, lastComp: '', lastCv: '', lastOp: '',
  };
  const M = {                // замеры (обновляются только в measure)
    vw: 1, vh: 1, dpr: 1, mob: false, docH: 1,
    hero: { cx: 0, cy: 0, w: 300 }, heroTop: 0, heroH: 1,
    park: { x: 0, y: 0, size: 84 }, compMark: 84, rest: { x: 0, y: 0 },
    secs: [], logo: null, looks: [], Wc: 300, Hc: 214, dockW: 200,
  };
  let stage = null, cv = null, comp = null, compTw = null, host = null, hostSvg = null, gyroBtn = null, dock = null, dockTw = null;
  let glh = null, twinURL = null, uid = 0;
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
  // двойник: пока нет снимка 3D — SVG; снимок пришёл — две картинки (рога + стрелка)
  function twin(cls) {
    const el = D.createElement('div');
    el.className = 'g-tw ' + cls;
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<div class="g-tw-in">${svgMark()}</div>`;
    return el;
  }
  function twinToImages(el) {
    if (!twinURL || !el) return;
    const inn = el.firstChild;
    inn.innerHTML = `<img class="g-tw-h" alt="" src="${twinURL.horns}"><img class="g-tw-n" alt="" src="${twinURL.needle}">`;
    inn.style.setProperty('--px', (twinURL.pivot[0] * 100).toFixed(2) + '%');
    inn.style.setProperty('--py', (twinURL.pivot[1] * 100).toFixed(2) + '%');
    inn._nd = null;
    el.dataset.img = '1';
  }
  function buildStage() {
    stage = D.createElement('div');
    stage.className = 'g-stage';
    comp = D.createElement('button');
    comp.type = 'button'; comp.className = 'g-comp'; comp.setAttribute('aria-label', 'Наверх'); comp.title = 'Наверх';
    compTw = twin('g-tw--comp'); comp.appendChild(compTw);
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
  }
  function buildDock() {
    const box = D.getElementById('footer-logo');
    if (!box || (dock === box && dockTw && dockTw.isConnected)) return;
    dock = box; dockTw = twin('g-tw--dock'); dock.appendChild(dockTw);
    if (S.twinReady) twinToImages(dockTw);
  }

  /* ═════════════════════ ЗАМЕРЫ (только здесь читаем layout) ═════════════════════ */
  const docRect = (el, sy) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top + sy, w: r.width, h: r.height }; };
  function measure() {
    if (!stage) return;
    buildHost(); buildDock();
    const sy = W.scrollY || 0;
    M.vw = R.clientWidth || innerWidth; M.vh = innerHeight; M.docH = R.scrollHeight;
    M.mob = !FINEQ.matches || NARROWQ.matches;
    M.dpr = Math.min(W.devicePixelRatio || 1, 2);
    // разделы: data-g (контракт), запасной путь — id
    const secs = [];
    const add = (name, el) => { if (el && !secs.some((s) => s.el === el)) { const r = docRect(el, sy); secs.push({ name, el, top: r.t, bot: r.t + r.h }); } };
    D.querySelectorAll('[data-g]').forEach((el) => add(el.dataset.g, el));
    [['hero', '#hero'], ['drop', '#drop'], ['looks', '#looks'], ['sign', '#sign'], ['sign', '#about'], ['next', '#next'], ['footer', '#footer']]
      .forEach(([n, s]) => { if (!secs.some((x) => x.name === n)) add(n, D.querySelector(s)); });
    secs.sort((a, b) => a.top - b.top); M.secs = secs;
    const hs = secs.find((s) => s.name === 'hero');
    M.heroTop = hs ? hs.top : 0; M.heroH = hs ? hs.bot - hs.top : M.vh;
    // hero-кадр: прямоугольник #g3d (K3); нет — правая треть hero
    let hb = host && host.getBoundingClientRect();
    if (!hb || hb.width < 24 || hb.height < 24) {
      const w = M.mob ? M.vw * 0.5 : M.vw * 0.32;
      hb = { left: M.vw - w - (M.mob ? 8 : 48), top: M.heroTop - sy + (M.mob ? 80 : M.vh * 0.22), width: w, height: w / ASPECT * 1.2 };
    }
    const Wc = Math.min(hb.width, hb.height * ASPECT);
    M.hero = { cx: hb.left + hb.width / 2, cy: hb.top + sy + hb.height / 2, w: Wc };
    // компаньон: desktop — у правого края по центру; размер — под свободное поле справа от сетки дропа
    if (M.mob) M.compMark = 48;
    else {
      const grid = D.querySelector('#drop [data-grid]') || D.querySelector('#drop .wrap') || D.querySelector('.wrap');
      // знак живёт в правом поле контейнера и не заходит на контент (критерий «ничего не перекрывать»)
      const gap = grid ? M.vw - grid.getBoundingClientRect().right : 64;
      M.compMark = Math.round(clamp(gap - 8, 48, 96));
      M.compRight = Math.max(4, Math.round((gap - M.compMark) / 2));
    }
    stage.style.setProperty('--g-comp', M.compMark + 'px');
    if (!M.mob) stage.style.setProperty('--g-right', (M.compRight || 16) + 'px');
    comp.style.transform = 'none';
    M.rest = { x: comp.offsetLeft + comp.offsetWidth / 2, y: comp.offsetTop + comp.offsetHeight / 2 };
    M.park = { x: M.rest.x, y: M.rest.y, size: M.compMark };
    S.lastComp = '';
    // логотип в подвале (K5: #footer-logo > .fo-logo): куда садится знак
    const lg = D.querySelector('#footer-logo .fo-logo, #footer-logo .ft-logo') || D.getElementById('footer-logo');
    if (lg) {
      const r = docRect(lg, sy), k = r.w / LOGO.w;
      const dl = dock ? docRect(dock, sy) : r;
      M.logo = { x: r.l + LOGO.cx * k, y: r.t + LOGO.cy * (r.h / LOGO.h), size: LOGO.mark * k, bl: dl.l, bt: dl.t };
      M.dockW = Math.max(40, M.logo.size / FILL);
      if (dockTw) { dockTw.style.width = M.dockW + 'px'; dockTw.style.height = (M.dockW / ASPECT) + 'px'; }
    } else M.logo = null;
    // отпечатки «Образов» (контракт: figure.look > .look-print)
    let prints = Array.from(D.querySelectorAll('#looks .look-print'));
    if (!prints.length) prints = Array.from(D.querySelectorAll('#looks .look'));
    M.looks = prints.map((el) => { const r = docRect(el, sy); return { x: r.l + r.w / 2, y: r.t + r.h / 2 }; });
    // канвас: CSS-размер постоянный (hero-кадр), масштаб — transform; буфер меняется отдельно
    const cw = Math.round(Math.max(Wc, M.compMark / FILL)), ch = Math.round(cw / ASPECT);
    if (cv && (cw !== M.Wc || ch !== M.Hc)) { cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; S.res = [0, 0]; S.lastCv = ''; }
    M.Wc = cw; M.Hc = ch;
    compTw.style.width = (M.compMark / FILL) + 'px'; compTw.style.height = (M.compMark / FILL / ASPECT) + 'px';
    S.settled = false;
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
    // стрелка доворачивает к цели не больше ±14°, знак не ломается (01_desktop #12)
    const a = Math.atan2(dy, dx) + Math.PI / 4;
    T.nd += clamp(Math.atan2(Math.sin(a), Math.cos(a)) * 0.18, -0.25, 0.25) * w;
  }
  function target(sy) {
    const hp = clamp((sy - M.heroTop) / heroK(), 0, 1), e = eio(hp);
    const H = M.hero, P = M.park, heroMark = H.w * FILL;
    // mobile: сначала быстро уменьшается и прижимается к правому краю, потом спускается в угол —
    // так путь не пересекает заголовок hero
    const ex = M.mob ? eo3(hp) : e;
    const T = {
      x: lerp(H.cx, P.x, ex),
      y: lerp(H.cy - sy * 0.5, P.y, e),         // в начале — полпараллакса за hero, дальше к парковке
      size: Math.exp(lerp(Math.log(heroMark), Math.log(P.size), ex)),
      rx: NEUTRAL.rx, ry: NEUTRAL.ry, rz: 0, nd: 0, s: 1, op: 1, hide: 0, dock: 0,
    };
    const live = !RMQ.matches && !SHOT;
    const wHero = live ? 1 - eio(clamp(hp / 0.35, 0, 1)) : 0, wPark = live ? clamp((hp - 0.6) / 0.4, 0, 1) : 0;
    // hero: курсор (desktop) / свайп и наклон (mobile)
    if (wHero > 0) {
      if (FINEQ.matches && S.px >= 0) lookAt(T, H.cx, H.cy - sy, S.px, S.py, wHero);
      if (S.gyro) { T.rx += S.gyro.rx * wHero; T.ry += S.gyro.ry * wHero; }
      T.ry += S.yaw * wHero; T.rx += S.pitch * wHero;
    }
    const sec = section(sy);
    if (wPark > 0) {
      // стрелка и знак наклоняются по направлению и скорости прокрутки
      const k = clamp(S.vel / 2400, -1, 1);
      T.nd += k * 0.45 * wPark; T.rx += k * 0.22 * wPark; T.rz += k * 0.06 * wPark;
      if (sec === 'drop' && S.card && FINEQ.matches) lookAt(T, P.x, P.y, S.card.x, S.card.y - sy, wPark);
      if (sec === 'looks' && M.looks.length) {
        let best = null, bd = 1e9;
        for (const L of M.looks) { const d = Math.hypot(L.y - sy - M.vh * 0.5, (L.x - M.vw * 0.5) * 0.5); if (d < bd) { bd = d; best = L; } }
        if (best && bd < M.vh * 0.6) lookAt(T, P.x, P.y, best.x, best.y - sy, wPark);
      }
      if (S.compHover) T.nd = -Math.PI / 4;     // наведение на компаньона: стрелка смотрит вверх — «наверх»
    }
    // знак прячется: «Знак» (сцена немого жеста) и открытый оверлей
    if ((sec === 'sign' && hp >= 1) || S.overlay) T.hide = 1;
    // подвал: подлетает к букве G логотипа и растворяется в ней
    if (M.logo && live && !S.overlay) {
      const maxS = Math.max(0, M.docH - M.vh);
      const end = Math.min(M.logo.y - M.vh * (M.mob ? 0.5 : 0.56), maxS - 2), start = end - M.vh * 0.55;
      const fp = clamp((sy - start) / Math.max(1, end - start), 0, 1);
      if (fp > 0) {
        const f = eio(fp);
        T.x = lerp(T.x, M.logo.x, f); T.y = lerp(T.y, M.logo.y - sy, f);
        T.size = lerp(T.size, M.logo.size, f);
        const nw = eio(clamp(fp / 0.5, 0, 1));
        T.rx = lerp(T.rx, NEUTRAL.rx, nw); T.ry = lerp(T.ry, NEUTRAL.ry, nw); T.nd *= 1 - nw; T.rz *= 1 - nw;
        T.op = fp > 0.8 ? 1 - (fp - 0.8) / 0.2 : 1;
        T.dock = fp; T.hide = 0;
      }
    } else if (M.logo && sec === 'footer') T.hide = 1;     // фолбэк/RM: компаньон уходит перед логотипом
    if (T.hide) { T.op = 0; if (live) T.x = M.vw + T.size; }
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
    let raw = 0;
    if (sy !== S.sy) { raw = (sy - S.sy) / dt; S.sy = sy; S.dirty = true; }
    const anim = t - S.birthT < 700 || t - S.nodT < 1300 || (t - S.spinT < 1200 && t > S.spinT - 200) || !!S.drag || Math.abs(S.yawV) > 0.01 || t - S.glIn < 400;
    if (!S.dirty && S.settled && !anim && S.vel === 0) return;   // покой — ноль работы
    S.vel = damp(S.vel, clamp(raw, -9000, 9000), raw ? 10 : 7, dt);
    if (Math.abs(S.vel) < 4 && !raw) S.vel = 0;
    // инерция свайпа и пружина «домой»
    if (!S.drag) {
      S.yaw += S.yawV * dt; S.yawV = damp(S.yawV, 0, 3.2, dt);
      if (Math.abs(S.yawV) < 0.6) { const home = Math.round(S.yaw / TAU) * TAU; S.yaw = damp(S.yaw, home, 4, dt); }
      S.pitch = damp(S.pitch, 0, 3, dt);
      if (Math.abs(S.yaw - Math.round(S.yaw / TAU) * TAU) < 0.0005 && Math.abs(S.yawV) < 0.01) { S.yaw = 0; S.yawV = 0; }
      if (Math.abs(S.pitch) < 0.0005) S.pitch = 0;
    }
    const T = target(sy);
    let P = S.pose;
    const fresh = !P;
    if (fresh) P = S.pose = Object.assign({}, T);
    const lp = T.dock > 0 ? 22 : T.hide ? 9 : 16, lr = 7;
    const still = RMQ.matches || SHOT;
    // у буквы логотипа сглаживание уходит: двойник жёстко «садится» в лого и едет с ним без отставания
    const lock = clamp((T.dock - 0.6) / 0.25, 0, 1);
    for (const k of ['x', 'y', 'size']) P[k] = still ? T[k] : lerp(damp(P[k], T[k], lp, dt), T[k], lock);
    for (const k of ['rx', 'ry', 'rz', 'nd']) P[k] = still ? T[k] : damp(P[k], T[k], lr, dt);
    P.op = still ? T.op : damp(P.op, T.op, 10, dt); P.dock = T.dock; P.hide = T.hide; P.s = 1;
    // одноразовые жесты — поверх сглаженной позы
    const V = Object.assign({}, P);
    const tb = (t - S.birthT) / 600;
    if (tb >= 0 && tb < 1 && S.origin) {
      const e = eo3(tb);
      V.x = lerp(S.origin.x, P.x, e); V.y = lerp(S.origin.y, P.y, e);
      V.size = lerp(P.size * 0.04, P.size, e); V.ry = P.ry - Math.PI * 0.85 * (1 - e); V.rx = P.rx + 0.4 * (1 - e);
      V.op = P.op * clamp(tb / 0.15, 0, 1);
    }
    const tn = (t - S.nodT) / 1000;
    if (tn >= 0 && tn < 1.3) { const a = Math.exp(-4.5 * tn) * Math.sin(tn * 15); V.rx += 0.34 * a; V.s = 1 + 0.05 * Math.max(0, a); }
    const ts = (t - S.spinT) / 1100;
    if (ts >= 0 && ts < 1) { V.ry += TAU * eo3(ts); V.s *= 1 + 0.1 * Math.sin(ts * Math.PI); }
    apply(V, t);
    // устоялось?
    const eps = Math.abs(P.x - T.x) + Math.abs(P.y - T.y) + Math.abs(P.size - T.size);
    const epr = Math.abs(P.rx - T.rx) + Math.abs(P.ry - T.ry) + Math.abs(P.rz - T.rz) + Math.abs(P.nd - T.nd);
    S.settled = eps < 0.25 && epr < 0.0015 && Math.abs(P.op - T.op) < 0.004 && !anim && S.vel === 0;
    if (S.settled) { Object.assign(P, T); apply(P, t); }
    S.dirty = false;
  }

  /* какой носитель показывает знак в этом кадре: gl (канвас) | comp (двойник-компаньон) | dock (двойник в подвале) | host (SVG в hero) */
  function carrierFor(P) {
    if (S.mode !== 'gl' || !S.glReady) {
      if (heroP() < 0.5 && !P.hide) return 'host';
      return P.dock >= 0.6 ? 'dock' : 'comp';
    }
    if (P.dock >= 0.6) return 'dock';
    if (M.mob && S.twinReady && heroP() >= 0.4) return 'comp';
    return 'gl';
  }
  function setCarrier(c) {
    if (c === S.carrier) return;
    S.carrier = c;
    stage.dataset.carrier = c;
    if (hostSvg) hostSvg.classList.toggle('is-on', c === 'host');
    comp.classList.toggle('is-vis', c === 'comp');
    if (c !== 'comp') comp.style.opacity = '';
    if (dockTw) dockTw.classList.toggle('is-on', c === 'dock');
    if (cv) cv.classList.toggle('is-on', c === 'gl');
    S.lastPost = null; S.lastComp = ''; S.lastCv = ''; S.lastOp = '';
  }
  const f2 = (v) => Math.round(v * 100) / 100;
  function apply(V, t) {
    const c = carrierFor(V);
    setCarrier(c);
    const vis = V.op > 0.01;
    const hid = !vis && c !== 'host';
    if (stage.classList.contains('is-hidden') !== hid) stage.classList.toggle('is-hidden', hid);
    // компаньон-кнопка «наверх»: кликабелен, когда припаркован
    const parked = heroP() >= 0.95 && !V.hide && V.dock < 0.3 && vis;
    if (comp.classList.contains('is-live') !== parked) comp.classList.toggle('is-live', parked);
    if (c === 'gl' || c === 'comp') {
      const still = (RMQ.matches || SHOT || S.mode === 'svg') && c === 'comp';
      const s = still ? 1 : V.size / M.compMark;
      const tr = still ? 'none' : `translate3d(${f2(V.x - M.rest.x)}px,${f2(V.y - M.rest.y)}px,0) scale(${s.toFixed(4)})`;
      if (tr !== S.lastComp) { comp.style.transform = tr; S.lastComp = tr; }
      if (c === 'comp') {
        comp.style.opacity = V.op.toFixed(3); twinPose(compTw, V);
        // mobile: под знаком проявляется тёмная «шайба» кнопки — компаньон читается как кнопка «наверх», а не как наклейка поверх текста
        const d = (clamp((heroP() - 0.5) / 0.4, 0, 1) * clamp(1 - V.dock * 2.5, 0, 1)).toFixed(2);
        if (comp._d !== d) { comp._d = d; comp.style.setProperty('--disc', d); }
      }
    }
    if (c === 'gl' && cv && glh) {
      const glOp = V.op * clamp((t - S.glIn) / 300, 0, 1);
      const s = V.size / (M.Wc * FILL);
      const tr = `translate3d(${f2(V.x - M.Wc / 2)}px,${f2(V.y - M.Hc / 2)}px,0) scale(${s.toFixed(4)})`;
      if (tr !== S.lastCv) { cv.style.transform = tr; S.lastCv = tr; }
      const o = glOp.toFixed(3); if (o !== S.lastOp) { cv.style.opacity = o; S.lastOp = o; }
      // SVG в hero гаснет, пока проявляется 3D (если three догрузился уже после рождения)
      if (hostSvg) {
        const x = t - S.glIn < 320 ? (1 - glOp).toFixed(3) : '';
        if (hostSvg._o !== x) { hostSvg._o = x; hostSvg.style.opacity = x; hostSvg.classList.toggle('is-on', x !== ''); }
      }
      // разрешение буфера — ступенями ×2^¼ под видимый размер (резкость без лишних пикселей)
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
    if (c === 'dock' && dockTw && M.logo) {
      // двойник живёт в подвале: координаты — относительно блока логотипа, прокрутку двигает браузер
      const sy = W.scrollY || 0, lx = V.x - M.logo.bl, ly = V.y - (M.logo.bt - sy);
      const s = V.size / (M.dockW * FILL);
      const tr = `translate3d(${f2(lx - M.dockW / 2)}px,${f2(ly - M.dockW / ASPECT / 2)}px,0) scale(${s.toFixed(4)})`;
      if (dockTw._tr !== tr) { dockTw.style.transform = tr; dockTw._tr = tr; }
      dockTw.style.opacity = V.op.toFixed(3);
      twinPose(dockTw, V);
    }
  }
  function twinPose(el, V) {
    const inn = el.firstChild;
    const still = RMQ.matches || SHOT || S.mode === 'svg';
    const tr = still ? '' : `rotateX(${(-(V.rx - NEUTRAL.rx)).toFixed(3)}rad) rotateY(${(V.ry - NEUTRAL.ry).toFixed(3)}rad) rotate(${V.rz.toFixed(3)}rad) scale(${(V.s || 1).toFixed(3)})`;
    if (inn._tr !== tr) { inn.style.transform = tr; inn._tr = tr; }
    const nd = still ? '0' : (V.nd * 57.2958).toFixed(2);
    if (inn._nd !== nd) {
      inn._nd = nd;
      const n = inn.querySelector('.g-tw-n');
      if (n) n.style.transform = `rotate(${nd}deg)`;
      else { const g = inn.querySelector('.g-sv-n'); if (g) g.setAttribute('transform', `rotate(${nd} ${GC[0]} ${GC[1]})`); }
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
      lite, aa: M.dpr < 2, strict: !SHOT, keep: SHOT, FILL, ASPECT, P_HORNS, P_G, GC,
      colors: { hi: '#e9ffd9', acid: tok('--c-acid', '#00FF2A'), green: tok('--c-green', '#00DB24'), deep: '#07791a', forest: tok('--c-forest', '#10340C') },
    };
  }
  function makeCanvas() {
    cv = D.createElement('canvas');
    cv.className = 'g-cv'; cv.setAttribute('aria-hidden', 'true');
    cv.style.width = M.Wc + 'px'; cv.style.height = M.Hc + 'px';
    stage.insertBefore(cv, comp);
    return cv;
  }
  const initPose = () => ({ rx: NEUTRAL.rx, ry: NEUTRAL.ry, rz: 0, nd: 0, s: 1 });
  function onGLReady() {
    if (S.mode !== 'gl') return;
    S.glReady = true; S.glIn = S.started ? now() : -1e9; S.lastPost = null; S.res = [0, 0]; S.carrier = '';
    stage.dataset.mode = 'gl'; GV.g.mode = 'gl'; GV.g.engine = glh && glh.kind;
    if (host) host.classList.add('is-gl');
    buildGyro(); wake();
  }
  function onTwin(s) {
    try {
      twinURL = { horns: URL.createObjectURL(s.horns), needle: URL.createObjectURL(s.needle), pivot: s.pivot };
      const a = new Image(), b = new Image(); a.src = twinURL.horns; b.src = twinURL.needle;
      const fin = () => { twinToImages(compTw); twinToImages(dockTw); S.twinReady = true; S.lastComp = ''; S.carrier = ''; wake(); };
      Promise.all([a.decode ? a.decode() : 0, b.decode ? b.decode() : 0]).then(fin, fin);
    } catch (e) { /* остаёмся на SVG-двойнике */ }
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
          if (m.t === 'ready') onGLReady();
          else if (m.t === 'twin') onTwin(m.s);
          else if (m.t === 'stats') { const cb = statsCb.get(m.id); if (cb) { statsCb.delete(m.id); cb(m.v); } }
          else if (m.t === 'error' || m.t === 'lost') toSVG(m.msg || m.t);
        };
        wk.onerror = () => toSVG('worker');
        glh = {
          kind: 'worker',
          pose: (p) => wk.postMessage({ t: 'pose', p }),
          res: (w, h) => wk.postMessage({ t: 'res', w, h }),
          stats: () => new Promise((res) => { const id = ++uid; statsCb.set(id, res); wk.postMessage({ t: 'stats', id }); setTimeout(() => res(null), 1500); }),
          kill: () => wk.terminate(),
        };
        // снимок двойника — под самый крупный показ (буква G логотипа в подвале), ×dpr
        const snapW = Math.round(clamp(Math.max(M.dockW, M.compMark / FILL) * M.dpr, 200, 900));
        wk.postMessage({ t: 'init', url: URL3, canvas: off, o, w: w0, h: h0, pose: p0, snap: snapW }, [off]);
        return;
      } catch (e) { if (wk) wk.terminate(); glh = null; cv.remove(); makeCanvas(); }
    }
    // главный поток: тяжёлое — в простое, чтобы не попасть на анимацию прелоадера; двойник — SVG
    const idle = (f) => (W.requestIdleCallback ? W.requestIdleCallback(f, { timeout: 2500 }) : setTimeout(f, 200));
    import(URL3).then((T) => new Promise((res, rej) => idle(() => {
      try {
        const E = ENGINE(T, cv, o);
        E.onLost(() => toSVG('lost'));
        E.setRes(w0, h0);
        glh = { kind: 'main', pose: (p) => E.render(p), res: (w, h) => { E.setRes(w, h); if (S.lastPost) E.render(S.lastPost); }, stats: () => Promise.resolve(E.info()), kill: () => E.dispose() };
        idle(() => E.warm(p0).then(res, rej));
        // двойник и здесь — в простое, после показа hero (иначе mobile держал бы WebGL на всём пути)
        setTimeout(() => idle(() => { if (S.mode === 'gl' && E.snap) E.snap(Math.round(clamp(Math.max(M.dockW, M.compMark / FILL) * M.dpr, 200, 640)), p0).then(onTwin, () => {}); }), 2500);
      } catch (e) { rej(e); }
    }))).then(onGLReady).catch((e) => toSVG('import: ' + ((e && e.message) || e)));
  }

  /* ═════════════════════ СОБЫТИЯ И ЖИЗНЕННЫЙ ЦИКЛ ═════════════════════ */
  function begin() {
    if (S.started || !stage) return;
    S.started = true;
    measure();
    if (!RMQ.matches && !SHOT) {
      S.birthT = now();
      if (!S.origin) S.origin = { x: M.vw / 2, y: M.vh / 2 };
      if (hostSvg && !S.glReady) hostSvg.classList.add('is-born');
    }
    S.glIn = S.glReady ? -1e9 : 0;
    stage.classList.add('is-started');
    S.ticker = useTicker();                  // GSAP (K1 подключает в конце body, до этого файла) — один общий тикер
    if (S.ticker) W.gsap.ticker.add(tick);
    wake();
  }
  // точка рождения: улыбка прелоадера (K4 может прислать detail.origin {x,y} — тогда берём её)
  function captureOrigin(e) {
    const d = e && e.detail;
    if (d && d.origin && isFinite(d.origin.x)) { S.origin = { x: +d.origin.x, y: +d.origin.y }; return; }
    if (S.origin || (d && typeof d.t === 'number' && d.t < 0.45)) return;
    const mk = D.querySelector('#loader .ld-mark');
    if (!mk || R.getAttribute('data-loader') === 'done') return;
    const r = mk.getBoundingClientRect();
    if (r.width > 8) S.origin = { x: r.left + r.width / 2, y: r.top + r.height * 0.66 };   // «тело» улыбки
  }
  function boot() {
    if (stage) return;
    S.overlay = R.hasAttribute('data-overlay');
    const wantGL = !RMQ.matches && !weakDevice() && !Q.has('nogl');
    S.mode = wantGL ? 'gl' : 'svg';
    buildStage(); buildHost(); buildDock();
    stage.dataset.mode = S.mode; GV.g.mode = S.mode;
    measure();
    if (wantGL) startGL();
    W.addEventListener('scroll', wake, { passive: true });
    W.addEventListener('pointermove', onPointer, { passive: true });
    D.addEventListener('pointerover', onOver, { passive: true });
    W.addEventListener('resize', remeasure, { passive: true });
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
        if (mo || list.every((m) => stage.contains(m.target) || (host && host.contains(m.target)) || (dock && dock.contains(m.target)))) return;
        mo = setTimeout(() => { mo = 0; remeasure(); }, 200);
      }).observe(D.body, { childList: true, subtree: true });
    }
    const ld = R.getAttribute('data-loader');
    if (SHOT || ld === 'off' || ld === 'done') begin();
    setTimeout(begin, 6000);                 // лоадер не прислал ready — не ждём вечно
  }

  D.addEventListener('grinchin:loader-progress', captureOrigin);
  D.addEventListener('grinchin:ready', () => { if (!stage) boot(); captureOrigin(); begin(); });
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
