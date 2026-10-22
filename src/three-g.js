/* GRINCHIN · 3D-G. Владелец: агент C.
   Объёмный знак «G в рогах» в #g3d; буква G внутри рогов — стрелка компаса игры «Точка сбора»
   (поворачивается к ближайшей ненайденной метке; G похожа на стрелку ↗ — pres_04).
   Контуры — оригинальный вектор из PDF (стр. 14, pdftocairo), не перерисовка.
   three.js (только ядро) грузится через import() после grinchin:ready и только когда #g3d виден.
   До загрузки и как фолбэк (нет WebGL, reduced-motion, слабое устройство, ошибка) — CSS-3D стопка SVG. */
(() => {
  'use strict';
  const GV = (window.GV = window.GV || {});
  const D = document, R = D.documentElement, W = window;

  // Центр знака — (0,0), ось Y вниз (как в SVG). 1 единица three = 130 единиц SVG.
  const P_HORNS = 'M0 124.8C0 124.8 11.5 89.3 51.3 72.8C95.1 54.6 121.7 35.8 140 5.3C163.5-33.5 144.5-82 144.5-82L95.8-24.2L93.9-25.5C93.9-25.5 141.5-119.2 146.9-130C146.9-130 196.1-66.6 180 0.4C164.7 64.1 103.9 74 60.1 86C18.2 97.5 0 129.3 0 129.3C0 129.3-18.2 97.5-60.2 86C-104 74-164.8 64.1-180.1 0.4C-196.2-66.6-147-130-147-130C-141.5-119.2-94-25.5-94-25.5L-95.9-24.2L-144.5-82C-144.5-82-163.6-33.5-140.1 5.3C-121.7 35.8-95.2 54.7-51.3 72.8C-11.5 89.3 0 124.8 0 124.8Z';
  const P_G = 'M61.1-14.6C61-6.8 59.4 0.9 56.4 8.1C53.9 15.2 50.2 21.8 45.5 27.7C40.1 34.2 33.3 39.4 25.6 42.9C17.4 46.6 8.2 48.4-2.9 48.4C-12.7 48.5-22.5 46.9-31.7 43.6C-40.4 40.5-48.3 35.8-55.1 29.6C-62.1 23.5-67.7 15.9-71.4 7.3C-75.4-2.1-77.4-12.3-77.2-22.6C-77.4-32.9-75.4-43.1-71.3-52.6C-67.5-61.1-61.9-68.7-54.8-74.9C-47.5-81.1-39.1-85.8-30.1-88.8C-20.1-92.1-9.6-93.7 0.9-93.6C15.5-93.6 28.1-91.4 38.8-86.8C48.8-82.7 57.7-76.2 64.7-68C71.3-60.1 75.5-50.6 77-40.5L45.9-40.5C44.8-45.9 42-50.9 38-54.9C33.6-59.1 28.3-62.2 22.5-64.1C15.6-66.4 8.3-67.5 0.9-67.3C-8.7-67.3-16.9-65.6-23.9-62.2C-30.7-58.9-36.4-53.6-40.1-47C-44-40.3-45.9-32.2-45.9-22.6C-45.9-13-43.9-4.8-39.9 2C-35.9 8.8-31.3 14-23.8 17.5C-16.3 21.1-8.7 22.9 1.4 22.9C11.2 22.9 17.8 21.7 25.1 18.3C32.3 14.8 37 10 41 4.1C45.3-2.2 46.2-7.1 47.9-14.6ZM6.2-0.9L6.2-23.3L77-23.3L77 45.7L54.7 45.7L54.7-0.9Z';
  const GC = [-0.2, -22.6];          // центр G — ось вращения стрелки
  const U = 130, VB = '-205 -140 410 280', LAYERS = 14;
  const URL3 = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.186.1/three.module.min.js';

  const Q = new URLSearchParams(location.search);
  const isShot = () => R.dataset.shot === '1' || Q.get('shot') === '1';
  const mq = (s) => (W.matchMedia ? W.matchMedia(s) : { matches: false });
  const RM = mq('(prefers-reduced-motion: reduce)');
  const FINE = mq('(hover: hover) and (pointer: fine)');
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const wrapA = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
  const tok = (n, f) => { try { return getComputedStyle(R).getPropertyValue(n).trim() || f; } catch (e) { return f; } };
  const now = () => performance.now();

  // ── состояние ────────────────────────────────────────────────────────────
  const S = {
    rx: 0, ry: 0, tx: 0, ty: 0, vy: 0, drag: null, gyro: false,
    needle: 0, nv: 0, needleT: 0, hasT: false, spin: 0, hover: false, compassUntil: 0,
    pop: -1e9, visible: false, t0: now(), lastIn: 0,
  };
  let host = null, box = null, label = null, flash = null, mode = 'none';
  let raf = 0, lastFrame = 0, lastTarget = 0, io = null, ro = null, size = { w: 0, h: 0 };
  let ready = false, wantGL = false, loading = false, gl = null;

  // ── парсер path d → THREE.Shape (M/L/H/V/C/Q/Z, абсолютные и относительные) ──
  function shapes(T, d) {
    const tk = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
    const out = []; let s = null, cmd = '', i = 0, x = 0, y = 0, sx = 0, sy = 0;
    const n = () => +tk[i++];
    const P = (px, py) => [px / U, -py / U];
    while (i < tk.length) {
      if (/[a-zA-Z]/.test(tk[i])) cmd = tk[i++];
      const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
      const ox = rel ? x : 0, oy = rel ? y : 0;
      if (C === 'Z') { if (s) s.closePath(); x = sx; y = sy; continue; }
      if (C === 'M') { x = ox + n(); y = oy + n(); sx = x; sy = y; s = new T.Shape(); out.push(s); s.moveTo(...P(x, y)); cmd = rel ? 'l' : 'L'; }
      else if (C === 'L') { x = ox + n(); y = oy + n(); s.lineTo(...P(x, y)); }
      else if (C === 'H') { x = ox + n(); s.lineTo(...P(x, y)); }
      else if (C === 'V') { y = oy + n(); s.lineTo(...P(x, y)); }
      else if (C === 'C') { const a = [ox + n(), oy + n(), ox + n(), oy + n(), ox + n(), oy + n()]; s.bezierCurveTo(...P(a[0], a[1]), ...P(a[2], a[3]), ...P(a[4], a[5])); x = a[4]; y = a[5]; }
      else if (C === 'Q') { const a = [ox + n(), oy + n(), ox + n(), oy + n()]; s.quadraticCurveTo(...P(a[0], a[1]), ...P(a[2], a[3])); x = a[2]; y = a[3]; }
      else i++; // неизвестная команда — пропускаем число, не падаем
    }
    return out;
  }

  // ── фактура скотча с заломами (canvas → CanvasTexture, 0 байт) ─────────────
  function tapeCanvases(green) {
    const N = 512; let seed = 20261007;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const strips = []; let y = 0;
    while (y < N) { const h = Math.min(N - y, 70 + rnd() * 60); strips.push([y, h, rnd()]); y += h; }
    const cols = []; for (let k = 0; k < 2; k++) cols.push([rnd() * N, 60 + rnd() * 40, rnd()]);
    const crinkles = [];
    for (let k = 0; k < 170; k++) {
      let px = rnd() * N, py = rnd() * N, a = rnd() * TAU; const pts = [[px, py]];
      const segs = 2 + (rnd() * 4) | 0, len = 6 + rnd() * 26;
      for (let j = 0; j < segs; j++) { a += (rnd() - 0.5) * 1.6; px += Math.cos(a) * len; py += Math.sin(a) * len; pts.push([px, py]); }
      crinkles.push([pts, rnd() < 0.55, 0.6 + rnd() * 1.6]);
    }
    const draw = (bump) => {
      const c = D.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
      g.fillStyle = bump ? '#808080' : green; g.fillRect(0, 0, N, N);
      for (const [sy, h, r] of strips) {           // горизонтальные полосы скотча
        g.fillStyle = bump ? `rgb(${120 + r * 30 | 0},${120 + r * 30 | 0},${120 + r * 30 | 0})` : `rgba(${r < 0.5 ? '255,255,255' : '0,40,0'},${0.04 + r * 0.07})`;
        g.fillRect(0, sy, N, h);
        g.fillStyle = bump ? '#5a5a5a' : 'rgba(0,50,0,.35)'; g.fillRect(0, sy + h - 2, N, 2);
        g.fillStyle = bump ? '#b8b8b8' : 'rgba(230,255,220,.28)'; g.fillRect(0, sy, N, 1.5);
      }
      for (const [cx, w, r] of cols) {              // пара вертикальных полос поверх, как у ленточных букв
        g.fillStyle = bump ? '#909090' : `rgba(${r < 0.5 ? '230,255,220' : '0,40,0'},.07)`;
        g.fillRect(cx, 0, w, N); g.fillRect(cx - N, 0, w, N);
        g.fillStyle = bump ? '#5c5c5c' : 'rgba(0,50,0,.3)'; g.fillRect(cx + w - 2, 0, 2, N); g.fillRect(cx + w - 2 - N, 0, 2, N);
      }
      g.lineJoin = 'round'; g.lineCap = 'round';
      for (const [pts, light, lw] of crinkles) {    // заломы — с повтором через край, чтобы фактура тайлилась
        g.strokeStyle = bump ? (light ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.5)') : (light ? 'rgba(235,255,225,.32)' : 'rgba(0,45,0,.3)');
        g.lineWidth = lw;
        for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
          g.beginPath(); pts.forEach(([px, py], j) => (j ? g.lineTo(px + ox, py + oy) : g.moveTo(px + ox, py + oy))); g.stroke();
        }
      }
      return c;
    };
    return { map: draw(false), bump: draw(true) };
  }

  // ── процедурное окружение для отражений (без HDR-файлов) ───────────────────
  function envScene(T, cG, cA, cL) {
    const s = new T.Scene();
    s.add(new T.Mesh(new T.SphereGeometry(20, 24, 12), new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, uniforms: { g: { value: cG } },
      vertexShader: 'varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform vec3 g;varying vec3 v;void main(){float h=v.y*.5+.5;gl_FragColor=vec4(mix(vec3(.004),g*.06,h),1.);}',
    })));
    const panel = (w, h, c, k, x, y, z) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c.clone().multiplyScalar(k), side: T.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
    };
    const wht = new T.Color(1, 1, 1);
    panel(9, 4, wht, 5, -5, 7, 7);    // софтбокс сверху-слева
    panel(1.4, 12, cA, 7, 9, 0, -1);  // зелёная вертикальная полоса справа — блик
    panel(12, 1.2, cL, 3, 0, -7, 5);  // лаймовый подсвет снизу
    panel(3, 3, wht, 2.2, 7, 5, 5);
    panel(1, 10, cA, 4, -9, 0, 2);
    return s;
  }

  // френелевое свечение по краям — onBeforeCompile на MeshPhysicalMaterial
  function addRim(m, color, k, p) {
    const u = { uRimC: { value: color }, uRimK: k, uRimP: { value: p } };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.fragmentShader = 'uniform vec3 uRimC;uniform float uRimK;uniform float uRimP;\n' + sh.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n totalEmissiveRadiance += uRimC * uRimK * pow(1.0 - saturate(abs(dot(normal, normalize(vViewPosition)))), uRimP);');
    };
    m.customProgramCacheKey = () => 'grn-rim';
  }

  function setupGL(T) {
    const canvas = D.createElement('canvas'); canvas.className = 'g3d__cv';
    const dpr = Math.min(W.devicePixelRatio || 1, 2);
    const renderer = new T.WebGLRenderer({ canvas, antialias: dpr < 2, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: isShot() });
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = T.NeutralToneMapping; renderer.toneMappingExposure = 1.05;

    const cG = new T.Color(tok('--c-green', '#00DB24')), cA = new T.Color(tok('--c-acid', '#00FF2A'));
    const cF = new T.Color(tok('--c-forest', '#10340C')), cL = new T.Color(tok('--c-lime', '#A9FF01'));
    const scene = new T.Scene();
    const cam = new T.PerspectiveCamera(26, 1, 0.1, 60);

    const pm = new T.PMREMGenerator(renderer);
    const env = envScene(T, cG, cA, cL);
    const envRT = pm.fromScene(env, 0.035);
    scene.environment = envRT.texture;
    env.traverse((o) => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); });
    pm.dispose();

    const cv = tapeCanvases(tok('--c-green', '#00DB24'));
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const tex = (c, srgb) => {
      const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(0.45, 0.45);
      t.anisotropy = aniso; if (srgb) t.colorSpace = T.SRGBColorSpace; return t;
    };
    const map = tex(cv.map, true), bump = tex(cv.bump, false);

    const rimK = { value: 0.85 };
    const face = new T.MeshPhysicalMaterial({
      color: 0xffffff, map, bumpMap: bump, bumpScale: 1.4, roughness: 0.46, metalness: 0,
      clearcoat: 0.85, clearcoatRoughness: 0.28, emissive: cG, emissiveIntensity: 0.07,
    });
    const side = new T.MeshPhysicalMaterial({
      color: cF.clone().lerp(cG, 0.22), roughness: 0.32, metalness: 0.08, clearcoat: 1, clearcoatRoughness: 0.12,
    });
    addRim(face, cA, rimK, 2.4); addRim(side, cA, rimK, 1.7);

    const ext = (d, depth, bev) => {
      const g = new T.ExtrudeGeometry(shapes(T, d), {
        depth, curveSegments: 14, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.55, bevelSegments: 3,
      });
      g.translate(0, 0, -depth / 2);
      return g;
    };
    const gH = ext(P_HORNS, 0.15, 0.035);
    const gG = ext(P_G, 0.22, 0.038);
    const gcx = GC[0] / U, gcy = -GC[1] / U;
    gG.translate(-gcx, -gcy, 0);

    const group = new T.Group();
    const horns = new T.Mesh(gH, [face, side]);
    const needle = new T.Mesh(gG, [face, side]);
    needle.position.set(gcx, gcy, 0.07);
    group.add(horns, needle); scene.add(group);

    const key = new T.DirectionalLight(0xffffff, 1.5); key.position.set(-3, 4, 5);
    const rimL = new T.DirectionalLight(cA, 3.2); rimL.position.set(4, 1.5, -3);
    const kick = new T.DirectionalLight(cL, 0.6); kick.position.set(-2, -4, 3);
    scene.add(key, rimL, kick, new T.AmbientLight(0xffffff, 0.12));

    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); toCSS(); }, false);
    box.insertBefore(canvas, label);

    const resize = (w, h) => {
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      const t = Math.tan(cam.fov * Math.PI / 360);
      const dist = Math.max(1.3 / t, 1.85 / (t * cam.aspect));   // знак ≈3.0×2.0 + запас на наклон
      cam.position.set(0, 0, dist); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
    };
    const render = (st) => {
      group.rotation.set(st.rx, st.ry, 0);
      group.position.y = st.fy;
      group.scale.setScalar(st.s);
      needle.rotation.z = -st.needle;
      rimK.value = 0.85 + st.flash * 2.4;
      renderer.render(scene, cam);
    };
    const dispose = () => {
      [gH, gG, face, side, map, bump, envRT].forEach((o) => o && o.dispose && o.dispose());
      renderer.dispose(); canvas.remove();
    };
    return { resize, render, dispose, canvas };
  }

  // ── DOM: CSS-3D фолбэк + места под canvas, подпись компаса, вспышку ─────────
  function mix(a, b, t) {
    const p = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
    const A = p(a), B = p(b);
    return '#' + A.map((v, k) => Math.round(v + (B[k] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  function build(h) {
    host = h;
    const g = tok('--c-green', '#00DB24'), a = tok('--c-acid', '#00FF2A'), f = tok('--c-forest', '#10340C');
    let layers = '';
    for (let i = LAYERS - 1; i >= 0; i--) {
      const fill = i === 0 ? 'url(#g3d-tape)' : i === 1 ? a : i < 6 ? mix(g, f, (i - 1) / 5) : mix(f, '#000000', (i - 6) / (LAYERS - 6) * 0.8);
      layers += `<svg class="g3d__l" viewBox="${VB}" style="--i:${i}" fill="${fill}"><use href="#g3d-h"/><g transform="translate(${GC[0]} ${GC[1]})"><g class="g3d__n"><use href="#g3d-g" x="${-GC[0]}" y="${-GC[1]}"/></g></g></svg>`;
    }
    box = D.createElement('div');
    box.className = 'g3d'; box.dataset.mode = 'css';
    box.innerHTML =
      `<svg class="g3d__defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>` +
      `<path id="g3d-h" d="${P_HORNS}"/><path id="g3d-g" d="${P_G}"/>` +
      `<pattern id="g3d-tape" patternUnits="userSpaceOnUse" width="140" height="132" patternTransform="rotate(-2)">` +
      `<rect width="140" height="132" fill="${g}"/><rect y="0" width="140" height="44" fill="${mix(g, '#ffffff', 0.1)}"/>` +
      `<rect y="88" width="140" height="44" fill="${mix(g, f, 0.12)}"/><rect x="92" width="34" height="132" fill="${mix(g, '#ffffff', 0.06)}" opacity=".8"/>` +
      `<path d="M0 43.5h140M0 87.5h140M125.5 0v132" stroke="${f}" stroke-opacity=".45" stroke-width="1.6"/>` +
      `<path d="M8 20l14-6 9 8 16-5M54 66l12 9 18-4 7 7M14 110l20-7 6 9M100 30l10 14 22 3M70 120l14-10 18 6" stroke="#fff" stroke-opacity=".3" fill="none" stroke-width="1.2"/>` +
      `<path d="M30 56l12 8 15-3M96 100l9-9 17 4M40 8l13 6M118 70l-10 12" stroke="${f}" stroke-opacity=".35" fill="none" stroke-width="1.2"/>` +
      `</pattern></defs></svg>` +
      `<div class="g3d__glow"></div><div class="g3d__shadow"></div>` +
      `<div class="g3d__fb"><div class="g3d__rot">${layers}</div></div>` +
      `<div class="g3d__flash"></div>` +
      `<div class="g3d__label" hidden><span class="g3d__arr">↓</span><span class="g3d__txt"></span></div>`;
    h.appendChild(box);
    label = box.querySelector('.g3d__label');
    flash = box.querySelector('.g3d__flash');

    // гироскоп — только на сенсорных устройствах и только по кнопке (iOS требует жест)
    if (!FINE.matches && W.DeviceOrientationEvent && !RM.matches && !isShot()) {
      const b = D.createElement('button');
      b.type = 'button'; b.className = 'g3d__gyro'; b.tabIndex = -1; b.textContent = '◎ наклон';
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          const rq = W.DeviceOrientationEvent.requestPermission;
          if (typeof rq === 'function' && (await rq.call(W.DeviceOrientationEvent)) !== 'granted') { b.textContent = 'нет доступа'; return; }
          W.addEventListener('deviceorientation', onTilt, { passive: true });
          b.hidden = true;
        } catch (err) { b.textContent = 'нет датчика'; }
      });
      box.appendChild(b);
    }
  }

  // ── ввод ────────────────────────────────────────────────────────────────
  function hostRect() { return host ? host.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 }; }
  function onMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    if (!S.visible) return;
    const r = hostRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    S.tx = clamp((e.clientY - cy) / innerHeight, -1, 1) * 0.42;
    S.ty = clamp((e.clientX - cx) / innerWidth, -1, 1) * 0.75;
    S.lastIn = now(); kick();
  }
  function onDown(e) {
    if (e.pointerType === 'mouse') return;
    S.drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; S.vy = 0; S.lastIn = now();
    S.compassUntil = now() + 5000; kick();
  }
  function onDrag(e) {
    const d = S.drag; if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY;
    S.ry += dx * 0.012; S.vy = dx * 0.012;
    S.tx = clamp(S.tx + dy * 0.004, -0.4, 0.4);
    S.lastIn = now(); kick();
  }
  function onUp(e) { if (S.drag && S.drag.id === e.pointerId) S.drag = null; }
  function onTilt(e) {
    if (e.beta == null) return;
    S.gyro = true;
    S.tx = clamp((e.beta - 40) / 40, -1, 1) * 0.4;
    S.ty = clamp(e.gamma / 35, -1, 1) * 0.7;
    S.lastIn = now(); kick();
  }

  // ── компас: направление на ближайшую ненайденную метку ────────────────────
  // В покое G стоит прямо (это знак бренда), направление пишет подпись. Стрелкой G
  // разворачивается в «режиме компаса»: наведение / касание / пара секунд после находки.
  const compassOn = () => S.hover || now() < S.compassUntil || Q.get('compass') === '1';
  const ARR = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
  function updTarget() {
    lastTarget = now();
    const game = GV.game;
    if (!host || !game || typeof game.target !== 'function') { S.hasT = false; if (label) label.hidden = true; return; }
    if (game.isComplete && game.isComplete()) {
      S.hasT = false; label.hidden = false; label.dataset.state = 'done';
      label.firstChild.textContent = '●'; label.lastChild.textContent = '5/5';
      return;
    }
    const r = hostRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const t = game.target(cx, cy);
    if (!t) { S.hasT = false; label.hidden = true; return; }
    const dx = t.x - cx, dy = t.y - cy, ang = Math.atan2(dy, dx);
    S.hasT = true;
    S.needleT = ang + Math.PI / 4;                 // стрелка G смотрит ↗ (−45°) — доворачиваем от неё
    const vh = innerHeight;
    const onScreen = t.y > 0 && t.y < vh;
    const where = onScreen ? (Math.hypot(dx, dy) < Math.max(r.width, r.height) ? 'рядом' : 'тут')
      : Math.abs(dy) > vh * 4 ? 'далеко' : dy > 0 ? 'ниже' : 'выше';
    label.hidden = false; label.dataset.state = 'play';
    label.firstChild.textContent = ARR[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
    label.lastChild.textContent = `метка ${where}`;
  }

  // ── цикл ────────────────────────────────────────────────────────────────
  function kick() { if (!raf && host && S.visible && !D.hidden && !isShot()) raf = requestAnimationFrame(frame); }
  function pose(t) {
    const motion = !RM.matches && !isShot();
    const tsec = (t - S.t0) / 1000;
    // наклон / поворот
    if (FINE.matches || S.gyro) {
      const k = RM.matches ? 1 : 0.07;
      S.rx += (S.tx - S.rx) * k; S.ry += (S.ty - S.ry) * k;
    } else {
      S.rx += (S.tx - S.rx) * 0.08;
      if (!S.drag) {
        S.ry += S.vy; S.vy *= 0.94;
        if (Math.abs(S.vy) < 0.004) { const home = Math.round(S.ry / TAU) * TAU; S.ry += (home - S.ry) * 0.05; }
        if (!S.lastIn || t - S.lastIn > 2500) S.tx *= 0.96;
      }
      if (mode !== 'webgl') { S.ry = clamp(S.ry, -0.65, 0.65); }
    }
    // стрелка-компас: пружина с небольшим перелётом
    const goal = S.hasT && compassOn() ? S.needleT : (motion ? Math.sin(tsec * 0.5) * 0.08 : 0);
    if (RM.matches) { S.needle = goal; S.nv = 0; }
    else { S.nv += wrapA(goal - S.needle) * 0.05; S.nv *= 0.84; S.needle += S.nv; }
    if (S.spin > 0.001) { S.spin *= 0.955; } else S.spin = 0;
    // «чпок» при находке
    const tp = (t - S.pop) / 1000;
    const popS = tp < 1.4 && !RM.matches ? 0.26 * Math.exp(-5 * tp) * Math.sin(16 * tp) : 0;
    const fl = tp < 1.4 ? Math.exp(-4 * tp) : 0;
    const br = motion ? 1 : 0;
    return {
      rx: S.rx + br * Math.sin(tsec * 0.8) * 0.05,
      ry: S.ry + br * Math.sin(tsec * 0.55) * 0.1,
      fy: br * Math.sin(tsec * 1.1) * 0.035,
      s: 1 + popS + br * Math.sin(tsec * 1.3) * 0.01,
      needle: S.needle + S.spin,
      flash: fl,
      busy: motion || compassOn() || Math.abs(S.tx - S.rx) + Math.abs(S.ty - S.ry) + Math.abs(S.nv) + Math.abs(S.vy) > 0.002 || tp < 1.4 || !!S.drag,
    };
  }
  function applyCSS(p) {
    const st = box.style;
    st.setProperty('--rx', (-p.rx * 57.3).toFixed(2) + 'deg');
    st.setProperty('--ry', (clamp(wrapA(p.ry), -0.7, 0.7) * 57.3).toFixed(2) + 'deg');
    st.setProperty('--fy', (-p.fy * size.h * 0.3).toFixed(1) + 'px');
    st.setProperty('--s', p.s.toFixed(4));
    st.setProperty('--nd', (p.needle * 57.3).toFixed(2) + 'deg');
  }
  function frame(t) {
    raf = 0;
    if (!host || !host.isConnected) return teardown();
    if (!S.visible || D.hidden) return;
    // на сенсорных экранах в покое — 30 fps, этого хватает «дыханию»
    if (!FINE.matches && !S.drag && t - lastFrame < 31) { raf = requestAnimationFrame(frame); return; }
    lastFrame = t;
    if (t - lastTarget > 350) updTarget();
    const p = pose(t);
    if (mode === 'webgl' && gl) gl.render(p); else applyCSS(p);
    if (p.busy) raf = requestAnimationFrame(frame);
  }
  function still() {
    // ?shot=1 — один статичный кадр в красивом ракурсе
    updTarget();
    S.rx = S.tx = 0.17; S.ry = S.ty = -0.42;
    S.needle = S.hasT && compassOn() ? S.needleT : 0;
    const p = { rx: S.rx, ry: S.ry, fy: 0, s: 1, needle: S.needle, flash: 0 };
    if (mode === 'webgl' && gl) gl.render(p); else applyCSS(p);
  }

  // ── загрузка three.js ───────────────────────────────────────────────────
  function glAvailable(strict) {
    try {
      const c = D.createElement('canvas'), o = strict ? { failIfMajorPerformanceCaveat: true } : {};
      const g = c.getContext('webgl2', o) || c.getContext('webgl', o);
      if (!g) return false;
      const x = g.getExtension('WEBGL_lose_context'); if (x) x.loseContext();
      return true;
    } catch (e) { return false; }
  }
  function weakDevice() {
    const n = navigator, c = n.connection;
    return !!((c && c.saveData) || (n.deviceMemory && n.deviceMemory <= 2) || (n.hardwareConcurrency && n.hardwareConcurrency <= 2));
  }
  function maybeLoad() {
    if (!wantGL || gl || loading || !host) return;
    if (!isShot() && (!ready || !S.visible)) return;
    loading = true;
    const go = () => import(URL3).then((T) => {
      if (!host) return;
      gl = setupGL(T);
      gl.resize(size.w || 1, size.h || 1);
      mode = 'webgl'; box.dataset.mode = 'webgl'; GV.g3d.mode = mode;
      if (isShot()) still(); else { S.t0 = now(); kick(); }
    }).catch(() => { toCSS(); }).then(() => { loading = false; });
    if (isShot()) go(); else (W.requestIdleCallback || ((f) => setTimeout(f, 120)))(go, { timeout: 1500 });
  }
  function toCSS() {
    wantGL = false;
    if (gl) { try { gl.dispose(); } catch (e) { /* уже потерян */ } gl = null; }
    mode = 'css'; if (box) box.dataset.mode = 'css'; GV.g3d.mode = mode;
    if (isShot()) still(); else kick();
  }

  // ── жизненный цикл ──────────────────────────────────────────────────────
  function boot(h) {
    build(h);
    mode = 'css'; GV.g3d.mode = mode;
    wantGL = !RM.matches && !weakDevice() && glAvailable(!isShot());
    ro = W.ResizeObserver ? new ResizeObserver(() => {
      const w = host.clientWidth, hh = host.clientHeight; if (!w || !hh) return;
      size = { w, h: hh };
      box.style.setProperty('--dz', (Math.min(w, hh * 1.45) * 0.0075).toFixed(2) + 'px');
      if (gl) gl.resize(w, hh);
      if (isShot()) still(); else kick();
    }) : null;
    if (ro) ro.observe(host); else { size = { w: host.clientWidth, h: host.clientHeight }; }
    io = W.IntersectionObserver ? new IntersectionObserver((es) => {
      S.visible = es[es.length - 1].isIntersecting;
      if (S.visible) { maybeLoad(); updTarget(); kick(); }
    }, { rootMargin: '120px' }) : null;
    if (io) io.observe(host); else S.visible = true;
    box.addEventListener('pointerdown', onDown);
    box.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { S.hover = true; updTarget(); kick(); } });
    box.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { S.hover = false; kick(); } });
    box.addEventListener('pointermove', onDrag);
    box.addEventListener('pointerup', onUp);
    box.addEventListener('pointercancel', onUp);
    if (isShot()) { S.visible = true; still(); maybeLoad(); setTimeout(still, 1500); } // повтор — после шрифтов и вёрстки
    else { maybeLoad(); updTarget(); kick(); }
  }
  function teardown() {
    if (io) io.disconnect(); if (ro) ro.disconnect();
    if (gl) { try { gl.dispose(); } catch (e) { /* noop */ } }
    gl = null; host = box = label = flash = null; mode = 'none'; GV.g3d.mode = mode; raf = 0;
    watch();
  }
  function pop() {
    S.pop = now(); S.compassUntil = now() + 2600;
    if (flash && !RM.matches) { flash.classList.remove('is-on'); void flash.offsetWidth; flash.classList.add('is-on'); }
    updTarget(); kick();
  }

  GV.g3d = { mode, pop, refresh: () => { updTarget(); kick(); }, state: S };

  W.addEventListener('pointermove', onMove, { passive: true });
  W.addEventListener('scroll', () => { if (S.visible && now() - lastTarget > 120) { updTarget(); kick(); } }, { passive: true });
  D.addEventListener('visibilitychange', () => { if (!D.hidden) kick(); });
  D.addEventListener('grinchin:ready', () => { ready = true; maybeLoad(); });
  D.addEventListener('grinchin:mark', pop);
  D.addEventListener('grinchin:gather-complete', () => { S.spin = TAU * 2; pop(); });
  if (RM.addEventListener) RM.addEventListener('change', () => { if (RM.matches && mode === 'webgl') toCSS(); });
  // если лоадера (B) нет или он не прислал ready — не ждём вечно
  setTimeout(() => { ready = true; maybeLoad(); }, 4000);

  // #g3d может появиться позже (разметку делает A) — ждём узел
  let mo = null;
  function watch() {
    const h = D.getElementById('g3d');
    if (h && !h.querySelector('.g3d')) { if (mo) { mo.disconnect(); mo = null; } boot(h); return; }
    if (!mo && W.MutationObserver) {
      mo = new MutationObserver(() => { const n = D.getElementById('g3d'); if (n && !n.querySelector('.g3d')) { mo.disconnect(); mo = null; boot(n); } });
      mo.observe(R, { childList: true, subtree: true });
    }
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', watch, { once: true }); else watch();
})();
