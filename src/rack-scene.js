/* GRINCHIN v4 · S1 · «Дроп на вешалках» — 3D-часть.
   Исполняется в Web Worker (исходник функций уходит в Blob, как ENGINE в site/src/three-g.js);
   без OffscreenCanvas-WebGL — те же функции на главном потоке.

   RACK_LOAD(urls)        → {T, X}: three.js 0.186.1 + GLTFLoader, MeshoptDecoder, RoomEnvironment.
                            Аддоны импортируют голое 'three' — в воркере import map нет, поэтому их исходник
                            переписывается на тот же Blob-URL ядра (один экземпляр three на всё).
   RACK_SCENE(T, X, o)    → сцена с интерфейсом сцен ENGINE: {scene, cam, apply(p, aspect)} + render/setup/load/info.
                            o.renderer — чужой (общий) рендерер: так сцена встаёт в GV.gl без второго контекста;
                            без него сцена заводит свой на o.canvas.
   Поза (p) целиком считается на главном потоке (физика, раскладка) — воркер ничего не помнит между кадрами,
   только ставит матрицы и рисует. Формат позы — в README. */
(function (G) {
  'use strict';

  async function RACK_LOAD(urls) {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const blob = (src) => URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const text = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(r.status + ' ' + u); return r.text(); };
    async function core(u) {
      // three.module.min.js тянет НЕминифицированный ./three.core.js (+125 КБ) — подменяем на .min, как в three-g.js
      const src = await text(u), IMP = 'from"./three.core.js"';
      const url = src.indexOf(IMP) >= 0 ? blob(src.split(IMP).join('from"' + new URL('three.core.min.js', u).href + '"')) : u;
      return { url, T: await import(url) };
    }
    // в сайте ядро уже загружено движком three-g.js (GV.gl): urls.T — его модуль, второй копии three не будет.
    // Аддоны берут классы из того же экземпляра: «import {A as B} from 'three'» → «const {A: B} = self.__GV_T3__».
    let T = urls.T || null, err = null;
    if (!T) for (const u of [urls.three[0], urls.three[1], urls.three[0]]) {
      try { T = (await core(u)).T; break; } catch (e) { err = e; await sleep(800); }
    }
    if (!T) throw err;
    self.__GV_T3__ = T;
    const fix = (src, map) => {
      src = src.replace(/import\s*\{([^}]*)\}\s*from\s*['"]three['"];?/g, (m, names) => 'const {' + names.replace(/\s+as\s+/g, ': ') + '} = self.__GV_T3__;');
      for (const k in map) src = src.split(k).join(map[k]);
      return src;
    };
    async function addons(root) {
      const [gl, bgu, su, re] = await Promise.all(['loaders/GLTFLoader.js', 'utils/BufferGeometryUtils.js', 'utils/SkeletonUtils.js',
        'environments/RoomEnvironment.js'].map((p) => text(root + p)));
      const ub = blob(fix(bgu, {})), us = blob(fix(su, {}));
      const GL = await import(blob(fix(gl, { "'../utils/BufferGeometryUtils.js'": '"' + ub + '"', "'../utils/SkeletonUtils.js'": '"' + us + '"' })));
      const RE = await import(blob(fix(re, {})));
      const MO = await import(root + 'libs/meshopt_decoder.module.js');
      return { GLTFLoader: GL.GLTFLoader, RoomEnvironment: RE.RoomEnvironment, MeshoptDecoder: MO.MeshoptDecoder };
    }
    let X = null;
    for (const r of [urls.addons[0], urls.addons[1], urls.addons[0]]) {
      try { X = await addons(r); break; } catch (e) { err = e; await sleep(800); }
    }
    if (!X) throw err;
    return { T, X };
  }

  function RACK_SCENE(T, X, o) {
    const TAU = Math.PI * 2;
    let renderer = o.renderer, gpu = '';
    const own = !renderer;
    if (own) {
      renderer = new T.WebGLRenderer({ canvas: o.canvas, antialias: !!o.aa, alpha: true, premultipliedAlpha: true, stencil: false, powerPreference: 'high-performance' });
      try {
        const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
        gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      } catch (e) { /* noop */ }
      if (!o.soft && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpu)) { renderer.dispose(); throw new Error('software-gl: ' + gpu); }
      renderer.setPixelRatio(1);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = T.SRGBColorSpace;
    }
    const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy()), anisoHi = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    let frames = 0, curW = 0, curH = 0;

    /* ── сцена, свет ──
       Тёмная вещь на чёрном читается контровым светом: два холодных «рима» сзади-сбоку + верхний.
       Ключ тёплый и умеренный, тон-маппинг Neutral — текстуры GLB не пересвечиваются. */
    const scene = new T.Scene();
    const pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new X.RoomEnvironment(), 0.04).texture;
    pm.dispose();
    scene.environmentIntensity = 0.42;
    const cam = new T.PerspectiveCamera(28, 1, 0.05, 40);
    const LT = new T.Object3D(); LT.position.set(0, -0.6, 0.2); scene.add(LT);
    const dl = (c, i, x, y, z) => { const l = new T.DirectionalLight(c, i); l.position.set(x, y, z); l.target = LT; scene.add(l); return l; };
    const LI = {
      key: dl(0xfff1e0, 1.45, -2.4, 2.6, 3.4),
      rimL: dl(0xd8e6ff, 2.1, -3.0, 1.6, -2.4),
      rimR: dl(0xffffff, 1.9, 3.1, 2.0, -2.2),
      top: dl(0xffffff, 0.8, 0.2, 4.2, 0.4),
      fill: dl(0xffffff, 0.22, 2.6, -0.4, 2.8),
    };

    /* ── материалы и геометрия (процедурно, без ассетов) ── */
    const V = (x, y, z) => new T.Vector3(x, y, z || 0);
    const curve = (pts, closed, k) => new T.CatmullRomCurve3(pts, !!closed, 'catmullrom', k == null ? 0.4 : k);
    const tube = (pts, r, closed, seg, rs, k) => new T.TubeGeometry(curve(pts, closed, k), seg || 48, r, rs || 10, !!closed);
    const MAT = {
      chrome: new T.MeshStandardMaterial({ color: 0xeeeeee, metalness: 1, roughness: 0.24 }),   // мягкий блик: при 0,13 тонкая полоса отражения мерцала лесенкой
      steel: new T.MeshStandardMaterial({ color: 0xa9a9a9, metalness: 1, roughness: 0.28 }),
      blackm: new T.MeshStandardMaterial({ color: 0x1b1b1b, metalness: 0.7, roughness: 0.3 }),
      clip: new T.MeshStandardMaterial({ color: 0x121212, metalness: 0.15, roughness: 0.45 }),
      ink: new T.MeshBasicMaterial({ color: 0x000000, side: T.BackSide, toneMapped: false }),
    };
    /* Труба — почти горизонтальная длинная кромка, яркий блик на силуэте против чёрного фона: даже 4×MSAA оставляет
       видимые ступени. Силуэт сглаживается аналитически: прозрачность по N·V с шириной в 1,5 пикселя (fwidth). */
    MAT.rail = MAT.chrome.clone();
    MAT.rail.transparent = true; MAT.rail.depthWrite = true;
    MAT.rail.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', '#include <opaque_fragment>\n' +
        'float rkNV = abs( dot( normalize( vNormal ), normalize( vViewPosition ) ) );\n' +
        'gl_FragColor.a *= clamp( rkNV / max( fwidth( rkNV ) * 1.5, 1e-4 ), 0.0, 1.0 );');
    };
    MAT.rail.customProgramCacheKey = () => 'rkRail';
    const texOf = (bmp) => {
      if (!bmp) return null;
      const t = new T.Texture(bmp);
      t.colorSpace = T.SRGBColorSpace; t.flipY = false; t.anisotropy = aniso; t.needsUpdate = true;
      return t;
    };
    // мультяшный скотч (стиль B): плоский тон без тона-маппинга + чёрный контур «вывернутой оболочкой»
    const tapeMat = (map) => new T.MeshBasicMaterial({ map, toneMapped: false, side: T.DoubleSide, alphaTest: 0.5 });
    function band(r, h, mat) {
      const g = new T.Group();
      g.add(new T.Mesh(new T.CylinderGeometry(r, r, h, 24, 1, true), mat));
      g.add(new T.Mesh(new T.CylinderGeometry(r * 1.32 + 0.0012, r * 1.32 + 0.0012, h + 0.0045, 24, 1, false), MAT.ink));
      return g;
    }
    function flagGeo(w, h, dir) {   // хвост ленты: склеенные концы, лёгкая волна
      const g = new T.PlaneGeometry(w, h, 10, 1), p = g.attributes.position;
      // dir=+1: хвост вправо от шейки (u=0 у шейки); dir=−1: влево (u=1 у шейки, текстура рисуется зеркальной формой)
      for (let i = 0; i < p.count; i++) { const x = p.getX(i) + w / 2, e = dir > 0 ? x : w - x; p.setX(i, dir > 0 ? x : x - w); p.setZ(i, 0.005 * Math.sin(e * 34) * Math.min(1, e * 30)); }
      g.computeVertexNormals();
      return g;
    }

    // крючок (не вращается вместе с вещью — вертлюг): обхватывает трубу/перекладину карабина вокруг точки 0,0,0
    const HOOK_R = 0.0042;
    const hookPts = [V(0, -0.108, 0), V(0, -0.08, 0.001), V(0, -0.05, 0.006), V(0, -0.03, 0.016)];
    for (let a = 125; a >= -112; a -= 13) { const r = a * Math.PI / 180; hookPts.push(V(0, -0.002 + 0.0262 * Math.cos(r), 0.0262 * Math.sin(r))); }
    const GEO = {
      hook: tube(hookPts, HOOK_R, false, 80, 8, 0.25),
      tip: new T.SphereGeometry(HOOK_R * 1.25, 10, 8),
      swivel: new T.CylinderGeometry(0.0078, 0.0078, 0.016, 16),
      topHanger: tube([V(0, -0.152), V(-0.1, -0.19), V(-0.198, -0.236), V(-0.21, -0.247), V(-0.19, -0.256), V(0, -0.256), V(0.19, -0.256),
        V(0.21, -0.247), V(0.198, -0.236), V(0.1, -0.19)], 0.0058, true, 96, 8, 0.3),
      neckTop: tube([V(0, -0.108), V(0, -0.13), V(0, -0.154)], 0.0058, false, 6, 8),
      botHanger: tube([V(0, -0.142), V(-0.09, -0.17), V(-0.172, -0.192), V(-0.18, -0.2), V(0, -0.2), V(0.18, -0.2), V(0.172, -0.192), V(0.09, -0.17)], 0.0052, true, 80, 8, 0.3),
      neckBot: tube([V(0, -0.108), V(0, -0.125), V(0, -0.144)], 0.0052, false, 6, 8),
      bar: new T.CylinderGeometry(0.0068, 0.0068, 0.37, 14).rotateZ(Math.PI / 2),
      clipJaw: new T.BoxGeometry(0.032, 0.046, 0.009),
      clipRing: new T.TorusGeometry(0.0085, 0.0022, 6, 16),
      link: new T.TorusGeometry(0.0142, 0.0043, 6, 16).scale(1, 1.62, 1),
      car: tube([V(-0.021, -0.036), V(-0.021, 0.02), V(-0.017, 0.042), V(-0.004, 0.055), V(0.012, 0.052), V(0.022, 0.038), V(0.024, 0.0),
        V(0.02, -0.03), V(0.008, -0.05), V(-0.008, -0.054), V(-0.018, -0.049)], 0.0054, true, 90, 10, 0.4),
      sleeve: new T.CylinderGeometry(0.0082, 0.0082, 0.032, 14),
      rod: new T.CylinderGeometry(HOOK_R, HOOK_R, 1, 8, 1, true),
    };
    const OFF = { top: -0.168, set: -0.168, bottom: -0.216 };   // где у вещи «плечи/пояс» (y=0 модели) относительно точки подвеса
    const CAR_Y = 0.049;                                        // центр карабина над точкой подвеса
    const CHAIN_L = 2.6, CHAIN_P = 0.0372;                      // длина цепи над карабином, шаг звена

    /* ── вещи ── */
    let items = [], byId = {}, rail = null, rigs = [], TX = {};
    function makeItem(m, i) {
      const it = { id: m.id, i, part: m.part, meta: m, root: new T.Group(), hook: new T.Group(), body: new T.Group(), gar: new T.Group(), stub: null, model: null, flag: null };
      it.root.add(it.hook, it.body); it.body.add(it.gar);
      it.gar.position.y = OFF[m.part] || OFF.top;
      const hk = new T.Mesh(GEO.hook, MAT.chrome); it.hook.add(hk);
      const tip = new T.Mesh(GEO.tip, MAT.chrome); tip.position.copy(hookPts[hookPts.length - 1]); it.hook.add(tip);
      const sw = new T.Mesh(GEO.swivel, MAT.chrome); sw.position.y = -0.108; it.hook.add(sw);
      // удлинитель шейки: капюшон не должен залезать на трубу — тело вешалки опускается, шейка тянется
      it.rod = new T.Mesh(GEO.rod, MAT.blackm); it.rod.visible = false; it.hook.add(it.rod); it.drop = 0;
      // скотч на шейке крючка: кольцо + хвост-флажок с номером (на фокусе — лаймовый, остальные — графит)
      const tg = new T.Group(); tg.position.set(0, -0.074, 0.0012);
      tg.add(band(0.0072, 0.024, TX.bandMat));
      const fl = new T.Mesh(GEO.flag, tapeMat(TX.tags[i] && TX.tags[i].off));
      fl.position.set(0.006, 0, 0.002); tg.add(fl);
      it.hook.add(tg); it.tag = tg; it.flag = fl; it.flagOn = false;
      if (m.part === 'bottom') {
        it.body.add(new T.Mesh(GEO.neckBot, MAT.blackm), new T.Mesh(GEO.botHanger, MAT.blackm));
        const bar = new T.Mesh(GEO.bar, MAT.chrome); bar.position.y = -0.2; it.body.add(bar);
        it.clips = [];
        for (const sx of [-1, 1]) {
          const c = new T.Group(); c.position.set(sx * 0.135, -0.2, 0);
          const ring = new T.Mesh(GEO.clipRing, MAT.chrome); ring.rotation.y = Math.PI / 2; c.add(ring);
          const jf = new T.Mesh(GEO.clipJaw, MAT.clip); jf.position.set(0, -0.031, 0.012); c.add(jf);
          const jb = new T.Mesh(GEO.clipJaw, MAT.clip); jb.position.set(0, -0.031, -0.012); c.add(jb);
          it.body.add(c); it.clips.push(c);
        }
      } else {
        it.body.add(new T.Mesh(GEO.neckTop, MAT.blackm), new T.Mesh(GEO.topHanger, MAT.blackm));
      }
      it.root.visible = false;
      scene.add(it.root);
      return it;
    }
    function clearGar(it, what) {
      const o = it[what]; if (!o) return;
      it.gar.remove(o);
      o.traverse((m) => {
        if (!m.isMesh) return;
        m.geometry.dispose();
        (Array.isArray(m.material) ? m.material : [m.material]).forEach((mt) => { for (const k in mt) if (mt[k] && mt[k].isTexture) mt[k].dispose(); mt.dispose(); });
      });
      it[what] = null;
    }
    function setDrop(it, top) {
      const d = Math.max(0, (OFF[it.part] || OFF.top) + top + 0.112);
      it.drop = d; it.body.position.y = -d;
      it.rod.visible = d > 0.002; it.rod.scale.y = Math.max(d, 0.001); it.rod.position.y = -0.108 - d / 2;
      return +d.toFixed(3);
    }
    // зажимы брюк — по настоящему поясу модели: ищем вершины верхних 4 см и берём край спереди/сзади и ширину
    function fitClips(it) {
      if (!it.clips || !it.model) return;
      it.gar.updateMatrixWorld(true);
      const inv = new T.Matrix4().copy(it.gar.matrixWorld).invert(), m = new T.Matrix4(), v = new T.Vector3();
      const pts = [];
      let top = -1e9;
      it.model.traverse((o) => {
        if (!o.isMesh) return;
        m.multiplyMatrices(inv, o.matrixWorld);
        const p = o.geometry.attributes.position, step = Math.max(1, (p.count / 40000) | 0);
        for (let i = 0; i < p.count; i += step) { v.fromBufferAttribute(p, i).applyMatrix4(m); pts.push(v.x, v.y, v.z); if (v.y > top) top = v.y; }
      });
      let hw = 0;
      for (let i = 0; i < pts.length; i += 3) if (pts[i + 1] > top - 0.04) hw = Math.max(hw, Math.abs(pts[i]));
      const cx = Math.max(0.06, Math.min(0.15, hw - 0.04));
      for (const c of it.clips) {
        const sx = Math.sign(c.position.x); let zf = -1e9, zb = 1e9;
        for (let i = 0; i < pts.length; i += 3) if (pts[i + 1] > top - 0.04 && Math.abs(pts[i] - sx * cx) < 0.025) { zf = Math.max(zf, pts[i + 2]); zb = Math.min(zb, pts[i + 2]); }
        if (zf < -1e8) { zf = 0.03; zb = -0.03; }
        c.position.x = sx * cx;
        c.children[1].position.set(0, -0.031, zf + 0.0045);
        c.children[2].position.set(0, -0.031, zb - 0.0045);
      }
      it.waistTop = top;
    }

    function buildRail(rp) {
      const pts = [];
      for (let i = 0; i <= 160; i++) { const x = -7 + (14 * i) / 160; pts.push(V(x, 0, rp.A * Math.exp(-(x / rp.W) * (x / rp.W)))); }
      const g = new T.Group();
      g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 640, 0.02, 40, false), MAT.rail));
      scene.add(g);
      return g;
    }
    function buildRig() {
      const K = 1.5;   // карабин и цепь крупнее вешалки — их видно издалека
      const rig = new T.Group(), H = CHAIN_L + (CAR_Y + 0.056) * K;
      const n = Math.ceil(CHAIN_L / (CHAIN_P * K));
      const links = new T.InstancedMesh(GEO.link, MAT.steel, n), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(K, K, K);
      for (let k = 0; k < n; k++) { e.set(0, k % 2 ? Math.PI / 2 : 0, 0); q.setFromEuler(e); m4.compose(V(0, -k * CHAIN_P * K - 0.02, 0), q, s); links.setMatrixAt(k, m4); }
      links.frustumCulled = false;
      rig.add(links);
      const car = new T.Group(); car.position.y = -H + CAR_Y * K; car.scale.setScalar(K);
      car.add(new T.Mesh(GEO.car, MAT.chrome));
      const sl = new T.Mesh(GEO.sleeve, MAT.steel); sl.position.set(0.023, 0.012, 0); sl.rotation.z = -0.05; car.add(sl);
      // лаймовый скотч на карабине: два витка по спинке + хвост с логотипом
      const t1 = band(0.0088, 0.03, TX.bandMat); t1.position.set(-0.021, 0.004, 0); car.add(t1);
      const t2 = band(0.0094, 0.012, TX.bandMat); t2.position.set(-0.021, -0.02, 0); t2.rotation.z = 0.12; car.add(t2);
      const fl = new T.Mesh(GEO.carFlag, tapeMat(TX.car)); fl.position.set(-0.027, 0.004, 0.003); car.add(fl);
      rig.add(car);
      const slot = new T.Group(); slot.position.y = -H; rig.add(slot);
      rig.visible = false;
      scene.add(rig);
      return { rig, slot, H };
    }

    function setup(s) {
      TX = { band: texOf(s.tex.band), car: texOf(s.tex.car), tags: (s.tex.tags || []).map((t) => ({ on: texOf(t.on), off: texOf(t.off) })) };
      TX.bandMat = new T.MeshBasicMaterial({ map: TX.band, toneMapped: false });
      GEO.flag = flagGeo(0.118, 0.046, 1);
      GEO.carFlag = flagGeo(0.17, 0.058, -1);
      items = s.items.map(makeItem);
      byId = {}; items.forEach((it) => (byId[it.id] = it));
      rail = buildRail(s.rail);
      rigs = [buildRig(), buildRig()];
      return precompile();
    }
    // KHR_parallel_shader_compile нет (SwiftShader, часть мобильных) — compileAsync лишь пишет предупреждение; тогда компилируем сразу
    // шейдеры собираются под тот же вывод, что и кадр (в MSAA-буфер: без тон-маппинга, линейный цвет) — иначе вторая сборка на первом кадре
    function precompile() {
      const rt = AA.mode === 'msaa' ? (AA.rt || (AA.rt = new T.WebGLRenderTarget(2, 2, { samples: 4, type: hf ? T.HalfFloatType : T.UnsignedByteType }))) : null;
      const prev = renderer.getRenderTarget();
      if (rt) renderer.setRenderTarget(rt);
      let pr = null;
      try {   // compileAsync запрашивает программы синхронно — цель возвращаем сразу, чтобы соседние сцены GV.gl не рисовали в наш буфер
        if (renderer.compileAsync && renderer.extensions.has('KHR_parallel_shader_compile')) pr = renderer.compileAsync(scene, cam);
        else renderer.compile(scene, cam);
      } finally { renderer.setRenderTarget(prev); }
      return pr;
    }

    /* ── загрузка: заглушка-фото (вырез «призрачного манекена») и GLB ── */
    const gltf = new X.GLTFLoader();
    gltf.setMeshoptDecoder(X.MeshoptDecoder);
    const bitmap = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(r.status + ' ' + u); return r.blob(); })
      .then((b) => createImageBitmap(b, { imageOrientation: 'flipY', premultiplyAlpha: 'none' }));
    async function loadStub(it, src, m) {
      const [fb, bb] = await Promise.all([bitmap(src[0]), src[1] ? bitmap(src[1]).catch(() => null) : null]);
      if (it.model) { fb.close && fb.close(); return { skipped: true }; }
      const w = (m.h * fb.width) / fb.height, g = new T.PlaneGeometry(w, m.h, 20, 1), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const u = (2 * p.getX(i)) / w; p.setZ(i, 0.06 * (1 - u * u)); }   // лёгкий объём
      g.computeVertexNormals();
      const grp = new T.Group(); grp.position.y = m.top - m.h / 2;
      const ft = texOf(fb);
      grp.add(new T.Mesh(g, new T.MeshStandardMaterial({ map: ft, alphaTest: 0.5, roughness: 0.82, metalness: 0, envMapIntensity: 0.6 })));
      const back = new T.Mesh(g, new T.MeshStandardMaterial({ map: bb ? texOf(bb) : ft, color: bb ? 0xffffff : 0x4a4a4a, alphaTest: 0.5, roughness: 0.85, metalness: 0, envMapIntensity: 0.6 }));
      back.rotation.y = Math.PI; grp.add(back);
      clearGar(it, 'stub');
      tmTree(grp);
      it.stub = grp; it.gar.add(grp);
      return { w: +w.toFixed(3), h: m.h, drop: setDrop(it, m.top) };
    }
    async function loadGLB(it, url, m, slot) {
      slot = slot || 'lod';
      const [g, g2] = await Promise.all([gltf.loadAsync(url), m.url2 ? gltf.loadAsync(m.url2).catch(() => null) : null]);
      const mdl = g.scene;
      if (m.rotY) mdl.rotation.y = m.rotY;
      mdl.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(mdl), sz = box.getSize(new T.Vector3());
      // конвенция (G1): метры, Y вверх, перёд +Z, плечи/пояс в y=0. Если файл ей явно не следует — раскладываем сами
      const conv = box.max.y > -0.06 && box.max.y < 0.36 && sz.y > 0.3 && sz.y < 1.9 && Math.abs((box.max.x + box.min.x) / 2) < 0.15;
      const place = m.place || 'check', wrap = new T.Group();
      wrap.add(mdl);
      let auto = false;
      if (place === 'auto' || (place === 'check' && !conv)) {
        auto = true;
        const s = m.h / sz.y;
        wrap.scale.setScalar(s);
        wrap.position.set((-(box.min.x + box.max.x) / 2) * s, m.top - box.max.y * s, (-(box.min.z + box.max.z) / 2) * s);
      }
      let tris = 0;
      [mdl, g2 && g2.scene].filter(Boolean).forEach((root) => root.traverse((o) => {
        if (!o.isMesh) return;
        const ge = o.geometry; tris += (ge.index ? ge.index.count : ge.attributes.position.count) / 3;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((mt) => {
          // ткань, а не пластилин: рельеф карты нормалей Tripo приглушаем, металличность убираем, шероховатость не ниже 0,8
          mt.envMapIntensity = m.env == null ? 0.6 : m.env;
          if (mt.normalScale) mt.normalScale.setScalar(m.normal == null ? 0.5 : m.normal);
          mt.metalness = 0;
          if (!mt.userData.rkCloth) {
            mt.userData.rkCloth = 1;
            const pre = mt.onBeforeCompile;
            mt.onBeforeCompile = (sh, r) => { if (pre) pre.call(mt, sh, r); sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = max( roughnessFactor, 0.8 );'); };
            const pk = mt.customProgramCacheKey ? mt.customProgramCacheKey() : '';
            mt.customProgramCacheKey = () => 'rkCloth' + pk;
          }
          ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'].forEach((k) => { if (mt[k]) mt[k].anisotropy = slot === 'full' ? anisoHi : aniso; });
        });
      }));
      if (g2) {   // брюки комплекта — на той же вешалке, пояс под курткой, чуть позади
        const p2 = g2.scene; p2.updateMatrixWorld(true);
        const b2 = new T.Box3().setFromObject(p2), s2 = b2.getSize(new T.Vector3()), w2 = new T.Group();
        const conv2 = b2.max.y > -0.06 && b2.max.y < 0.2 && s2.y > 0.6 && s2.y < 1.3;
        const k2 = conv2 ? 1 : 1.04 / s2.y; w2.scale.setScalar(k2);
        w2.position.set(-((b2.min.x + b2.max.x) / 2) * k2, (m.pantsY == null ? -0.36 : m.pantsY) - b2.max.y * k2, -((b2.min.z + b2.max.z) / 2) * k2 - 0.035);
        w2.add(p2); wrap.add(w2);
        if (auto) { w2.scale.divideScalar(wrap.scale.x); w2.position.sub(wrap.position).divideScalar(wrap.scale.x); }
      }
      tmTree(wrap);
      const old = it[slot]; it[slot] = wrap; wrap.userData.tris = Math.round(tris);
      if (old) disposeTree(old);
      return show(it, auto);
    }
    function disposeTree(o) {
      if (o.parent) o.parent.remove(o);
      o.traverse((m) => {
        if (!m.isMesh) return;
        m.geometry.dispose();
        (Array.isArray(m.material) ? m.material : [m.material]).forEach((mt) => { for (const k in mt) if (mt[k] && mt[k].isTexture) mt[k].dispose(); mt.dispose(); });
      });
    }
    // на вешалке — лучшая из загруженных версий: полная (2048, ~290 тыс. треуг.) для вещи в фокусе, иначе лёгкая
    async function show(it, auto) {
      const wrap = it.full || it.lod; if (!wrap) return null;
      if (it.model !== wrap) { if (it.model) it.gar.remove(it.model); it.model = wrap; it.gar.add(wrap); }
      clearGar(it, 'stub');
      fitClips(it);
      wrap.updateMatrixWorld(true);
      const fb = new T.Box3(), mw = new T.Matrix4().copy(wrap.matrixWorld).invert().premultiply(new T.Matrix4().compose(wrap.position, wrap.quaternion, wrap.scale));
      wrap.traverse((o) => { if (o.isMesh) { o.geometry.computeBoundingBox(); fb.union(o.geometry.boundingBox.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(mw, o.matrixWorld))); } });
      const fs = fb.getSize(new T.Vector3());
      const drop = setDrop(it, fb.max.y);
      await precompile();   // шейдер — сразу, без рывка на первом кадре
      return { drop, top: +fb.max.y.toFixed(3), tris: wrap.userData.tris, auto: !!auto, full: wrap === it.full, size: [fs.x, fs.y, fs.z].map((v) => +v.toFixed(3)) };
    }
    function dropFull(id) { const it = byId[id]; if (!it || !it.full) return false; const f = it.full; it.full = null; if (it.model === f) it.model = null; disposeTree(f); show(it); return true; }
    async function load(id, kind, src, meta) {
      const it = byId[id]; if (!it) throw new Error('нет вещи ' + id);
      const t0 = performance.now();
      const r = kind === 'glb' || kind === 'full' ? await loadGLB(it, src, meta || it.meta, kind === 'full' ? 'full' : 'lod') : await loadStub(it, src, meta || it.meta);
      r.ms = Math.round(performance.now() - t0);
      return r;
    }

    /* ── поза → матрицы ──
       p.m: 0 — рейл, 1 — цепь. p.c: [x,y,z, tx,ty,tz, fov]. p.it: по 9 чисел на вещь
       [x, y, z, yaw, swing, tilt, vis, focus, hookYaw]. p.r: два «подвеса» [idx, dy, yaw, swx, swz]. */
    const STRIDE = 9;
    function apply(p, aspect) {
      const c = p.c;
      cam.fov = c[6]; cam.aspect = aspect; cam.position.set(c[0], c[1], c[2]); cam.lookAt(c[3], c[4], c[5]); cam.updateProjectionMatrix();
      const chain = p.m === 1;
      rail.visible = !chain;
      const held = new Set();
      if (chain) {
        for (let k = 0; k < 2; k++) {
          const q = p.r[k], R = rigs[k], idx = q[0] | 0;
          R.rig.visible = idx >= 0;
          if (idx < 0) continue;
          const it = items[idx]; held.add(idx);
          R.rig.position.set(0, R.H + q[1], 0);
          R.rig.rotation.set(q[3], q[2], q[4], 'ZXY');
          if (it.root.parent !== R.slot) R.slot.add(it.root);
          it.root.position.set(0, 0, 0); it.root.rotation.set(0, 0, 0);
          it.hook.rotation.y = 0; it.body.rotation.y = 0; it.root.visible = true; it.tag.visible = false;
        }
      } else rigs.forEach((R) => (R.rig.visible = false));
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (chain) { if (!held.has(i)) it.root.visible = false; continue; }
        const a = p.it, k = i * STRIDE;
        if (it.root.parent !== scene) scene.add(it.root);
        it.root.visible = a[k + 6] > 0;
        if (!it.root.visible) continue;
        it.root.position.set(a[k], a[k + 1], a[k + 2]);
        it.root.rotation.set(a[k + 5], 0, a[k + 4], 'ZXY');
        it.hook.rotation.y = a[k + 8];
        it.body.rotation.y = a[k + 3];
        it.tag.visible = true;
        const on = a[k + 7] > 0.5;
        if (on !== it.flagOn && TX.tags[i]) { it.flagOn = on; it.flag.material.map = on ? TX.tags[i].on : TX.tags[i].off; it.flag.material.needsUpdate = true; }
      }
    }
    function size(w, h) { w = Math.max(2, w | 0); h = Math.max(2, h | 0); if (w !== curW || h !== curH) { renderer.setSize(w, h, false); curW = w; curH = h; } }
    /* Сглаживание. Общий контекст GV.gl на DPR ≥ 2 создан без antialias — тонкая хромированная труба и крючки шли «лесенкой».
       Поэтому рейл рисуется в свой MSAA-буфер (WebGL2: 4 сэмпла, на больших буферах — 2; half-float, чтобы тон-маппинг
       шёл после сглаживания), а на экран выводится одним квадом — с тон-маппингом Neutral и sRGB.
       Контекст с antialias (свой рендерер прототипа на DPR 1) — рисуем напрямую. */
    const AA = { mode: 'ctx', rt: null, v: new T.Vector2() };
    try {
      // свой буфер — всегда на WebGL2, даже если контекст со сглаживанием (DPR 1): сглаживание контекста идёт после
      // нашего тон-маппинга только в своём буфере; плюс одинаковая картинка на любом DPR
      if (renderer.capabilities.isWebGL2 && !o.noMSAA) AA.mode = 'msaa';
    } catch (e) { /* noop */ }
    const hf = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
    /* Тон-маппинг — до сглаживания, в каждом сэмпле. Иначе блик хрома (HDR ≫ 1) усредняется с чёрным фоном,
       после тон-маппинга край снова белый — и «лесенка» остаётся. three.js в буфер тон-маппинг не пишет, поэтому
       в материалы рейла вшит тот же Neutral (формула three.js, экспозиция 1). */
    const NEUTRAL = 'vec3 rkNeutral(vec3 c){float x=min(c.r,min(c.g,c.b));float o=x<0.08?x-6.25*x*x:0.04;c-=o;float p=max(c.r,max(c.g,c.b));' +
      'if(p<0.76)return c;float d=0.24;float n=1.0-d*d/(p+d-0.76);c*=n/p;float g=1.0-1.0/(0.15*(p-n)+1.0);return mix(c,vec3(n),g);}\n';
    function tmBake(mt) {
      if (AA.mode !== 'msaa' || !mt || mt.toneMapped === false || mt.userData.rkTM) return;
      mt.userData.rkTM = 1;
      const pre = mt.onBeforeCompile, preKey = mt.customProgramCacheKey ? mt.customProgramCacheKey() : '';
      mt.onBeforeCompile = (sh, r) => { if (pre) pre.call(mt, sh, r); sh.fragmentShader = NEUTRAL + sh.fragmentShader.replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb = rkNeutral( gl_FragColor.rgb );'); };
      mt.customProgramCacheKey = () => 'rkTM' + preKey;
      mt.needsUpdate = true;
    }
    const tmTree = (o) => o.traverse((m) => { if (m.isMesh) (Array.isArray(m.material) ? m.material : [m.material]).forEach(tmBake); });
    const outScene = new T.Scene(), outCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const blit = new T.ShaderMaterial({
      uniforms: { tMap: { value: null } }, depthTest: false, depthWrite: false, blending: T.NoBlending, toneMapped: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D tMap; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tMap, vUv);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
    });
    const quad = new T.Mesh(new T.PlaneGeometry(2, 2), blit); quad.frustumCulled = false; outScene.add(quad);
    function msaa() {
      const sz = renderer.getDrawingBufferSize(AA.v), w = sz.x | 0, h = sz.y | 0;
      if (!AA.rt) AA.rt = new T.WebGLRenderTarget(w, h, { samples: w * h > 2.6e6 ? 2 : 4, type: hf ? T.HalfFloatType : T.UnsignedByteType, depthBuffer: true });
      else if (AA.rt.width !== w || AA.rt.height !== h) { AA.rt.samples = w * h > 2.6e6 ? 2 : 4; AA.rt.setSize(w, h); }
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(AA.rt); renderer.clear(true, true, false);
      renderer.render(scene, cam);
      renderer.setRenderTarget(prev);
      blit.uniforms.tMap.value = AA.rt.texture;
    }
    // общий рендерер (GV.gl) живёт без тон-маппинга — ставим свой на время кадра этой сцены и возвращаем
    const TMS = { tm: 0, te: 1 };
    const tmOn = (r) => { TMS.tm = r.toneMapping; TMS.te = r.toneMappingExposure; r.toneMapping = T.NeutralToneMapping; r.toneMappingExposure = 1.0; };
    const tmOff = (r) => { r.toneMapping = TMS.tm; r.toneMappingExposure = TMS.te; };
    const shown = AA.mode === 'msaa' ? outScene : scene, shownCam = AA.mode === 'msaa' ? outCam : cam;
    if (AA.mode !== 'msaa') { shown.onBeforeRender = tmOn; shown.onAfterRender = tmOff; }
    else Object.values(MAT).forEach(tmBake);
    function render(p, w, h) {
      if (!rail) return false;
      size(w, h); apply(p, w / h);
      if (AA.mode === 'msaa') msaa();
      renderer.render(shown, shownCam);
      frames++;
      return true;
    }
    // вход для общего движка: GV.gl.xmsg('rack', m) → сюда
    async function msg(m) {
      if (m.t === 'setup') { await setup(m.s); return { ok: 1 }; }
      if (m.t === 'load') return load(m.id, m.kind, m.src, m.meta);
      if (m.t === 'drop') return dropFull(m.id);
      if (m.t === 'info') return info();
      return null;
    }
    function info() {
      const r = renderer.info.render;
      return { frames, calls: r.calls, tris: r.triangles, programs: (renderer.info.programs || []).length, geos: renderer.info.memory.geometries, texs: renderer.info.memory.textures, gpu,
        loaded: items.map((it) => (it.full ? 'full' : it.lod ? 'glb' : it.stub ? 'stub' : '-')), aa: AA.mode, rt: AA.rt ? [AA.rt.width, AA.rt.height, AA.rt.samples, AA.rt.texture.type] : null, maxSamples: renderer.getContext().getParameter(renderer.getContext().MAX_SAMPLES || 0x8D57), buf: [curW, curH] };
    }
    // для общего движка (ENGINE.render рисует s.scene/s.cam после apply): в режиме MSAA это квад вывода
    return { scene: shown, cam: shownCam, apply: (p, a) => { if (rail) { apply(p, a); if (AA.mode === 'msaa') msaa(); } }, render, setup, load, msg, info, gpu, canvas: renderer.domElement, frames: () => frames, renderer, LIGHTS: LI };
  }

  G.GV_RACK_LOAD = RACK_LOAD;
  G.GV_RACK_SCENE = RACK_SCENE;
})(typeof window !== 'undefined' ? window : self);
