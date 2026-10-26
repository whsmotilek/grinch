/* GRINCHIN v4 · маскот «Гринчин» (V3) → window.GV.mascot
   Виниловая игрушка (Higgsfield, ~/Проекты/GV/hf/mascot/final): позы с альфой (webp 360/720/1200 по высоте),
   анимации — webm VP9-альфа (Chrome/Firefox) или HEVC-альфа .mov (Safari/iOS) + постер, стикеры (стиль B).

   API
     GV.mascot.mount(el, {pose, anim, once, idle}) → экземпляр {el, pose, set(pose), react(ev), hop(), enter(from), destroy()}
       pose — preloader | hero | menu | cart-empty | cart-add | 404 | footer | subscribe | idle (или имя слота: cart → cart-empty);
       anim — preloader_peek | footer_swing | 'none' (hero-видео — у V1: img/v4/hero/, слот hero/preloader он рисует сам). Видео грузится, только когда слот
              рядом с экраном, и ставится на паузу вне экрана. Пока кадра нет — постер (первый кадр), совмещённый с видео;
       once — сыграть один раз и застыть на последнем кадре;
       idle — что после once: 'bob' (лёгкое покачивание, CSS) | 'none'.
     GV.mascot.pop(pose='cart-add', ms=1200) — всплывающий маскот у правого нижнего края (реакция на grinchin:add)
     GV.mascot.react(ev) — 'add' | 'empty' | 'subscribe' | 'hop' | 'wave'
     GV.mascot.url(pose, h) · .sticker(name) · .stickers · .stickerAR · .level() · .axis() · .meta(name)
   Слоты [data-mascot-slot="preloader|hero|menu|cart|404|footer|subscribe"] монтируются сами (и появившиеся позже).
   Атрибуты слота: data-mascot-pose, data-mascot-anim ('none' — без видео), data-mascot-manual (не монтировать автоматически).
   Коробка .mz внутри слота — ширина слота × пропорция позы (или рамки фигуры в видео): высоту слоту задавать не нужно.

   Ось html[data-mascot]: grinchin — во всех слотах · quiet — только подвал, статично · none — нигде.
   Живость: ось data-mzfx = calm | max (без оси — data-m="2") → «максимум» (меню машет, idle-подмигивания раз в 7–12 с);
   reduced-motion и ?shot=1 — только статичные позы, видео не грузится. Движения — CSS/WAAPI (transform/opacity). */
(function () {
  "use strict";
  var d = document, root = d.documentElement, W = window;
  var GV = (W.GV = W.GV || {});
  if (GV.mascot && GV.mascot.v === 4) return;

  /* ---------- ассеты (пути раскрывает build.py) ---------- */
  // поза: [ширина/высота, h360, h720, h1200]
  var POSE = {
    preloader: [0.5533, "{{asset:img/v4/mascot/preloader-360.webp}}", "{{asset:img/v4/mascot/preloader-720.webp}}", "{{asset:img/v4/mascot/preloader-1200.webp}}"],
    hero: [0.8108, "{{asset:img/v4/mascot/hero-360.webp}}", "{{asset:img/v4/mascot/hero-720.webp}}", "{{asset:img/v4/mascot/hero-1200.webp}}"],
    menu: [0.5558, "{{asset:img/v4/mascot/menu-360.webp}}", "{{asset:img/v4/mascot/menu-720.webp}}", "{{asset:img/v4/mascot/menu-1200.webp}}"],
    "cart-empty": [0.8292, "{{asset:img/v4/mascot/cart-empty-360.webp}}", "{{asset:img/v4/mascot/cart-empty-720.webp}}", "{{asset:img/v4/mascot/cart-empty-1200.webp}}"],
    "cart-add": [0.7417, "{{asset:img/v4/mascot/cart-add-360.webp}}", "{{asset:img/v4/mascot/cart-add-720.webp}}", "{{asset:img/v4/mascot/cart-add-1200.webp}}"],
    "404": [0.82, "{{asset:img/v4/mascot/404-360.webp}}", "{{asset:img/v4/mascot/404-720.webp}}", "{{asset:img/v4/mascot/404-1200.webp}}"],
    footer: [0.5875, "{{asset:img/v4/mascot/footer-360.webp}}", "{{asset:img/v4/mascot/footer-720.webp}}", "{{asset:img/v4/mascot/footer-1200.webp}}"],
    subscribe: [0.7508, "{{asset:img/v4/mascot/subscribe-360.webp}}", "{{asset:img/v4/mascot/subscribe-720.webp}}", "{{asset:img/v4/mascot/subscribe-1200.webp}}"],
    idle: [0.5567, "{{asset:img/v4/mascot/idle-360.webp}}", "{{asset:img/v4/mascot/idle-720.webp}}", "{{asset:img/v4/mascot/idle-1200.webp}}"]
  };
  // видео: fw×fh — кадр (footer_swing v4.1 — вырезан по фигуре в РОДНОМ разрешении 368×636, без даунскейла: на DPR 2–3
  // 480-й кадр давал мыло); bb — рамка фигуры на постере/последнем кадре в координатах кадра, по ней видео совмещается
  // с коробкой; end — поза = последний кадр (для «без движения»);
  // seat — линия сиденья от верха рамки (подвал)
  var ANIM = {
    preloader_peek: { webm: "{{asset:img/v4/mascot/anim/preloader_peek.webm}}", mov: "{{asset:img/v4/mascot/anim/preloader_peek.mov}}",
      poster: "{{asset:img/v4/mascot/anim/preloader_peek-poster.webp}}", fw: 720, fh: 720, bb: [0, 49, 320, 671], loop: true, end: "preloader" },
    footer_swing: { webm: "{{asset:img/v4/mascot/anim/footer_swing.webm}}", mov: "{{asset:img/v4/mascot/anim/footer_swing.mov}}",
      poster: "{{asset:img/v4/mascot/anim/footer_swing-poster.webp}}", fw: 368, fh: 636, bb: [14, 14, 352, 612], loop: true, end: null, seat: 0.694 }
  };
  var ST = {
    crossout: "{{asset:img/v4/mascot/st-crossout.webp}}", kapushon: "{{asset:img/v4/mascot/st-kapushon.webp}}", "new": "{{asset:img/v4/mascot/st-new.webp}}",
    peek: "{{asset:img/v4/mascot/st-peek.webp}}", run: "{{asset:img/v4/mascot/st-run.webp}}", shrug: "{{asset:img/v4/mascot/st-shrug.webp}}",
    tape: "{{asset:img/v4/mascot/st-tape.webp}}", thumbsup: "{{asset:img/v4/mascot/st-thumbsup.webp}}",
    "arrow-turn": "{{asset:img/v4/scenes/sticker-1-arrow-turn.webp}}", "arrow-zigzag": "{{asset:img/v4/scenes/sticker-2-arrow-zigzag.webp}}",
    "stop-crossed": "{{asset:img/v4/scenes/sticker-3-stop-crossed.webp}}", sparkle: "{{asset:img/v4/scenes/sticker-4-sparkle.webp}}",
    "noentry-crossed": "{{asset:img/v4/scenes/sticker-5-noentry-crossed.webp}}", stars: "{{asset:img/v4/scenes/sticker-6-stars.webp}}",
    stamp: "{{asset:img/v4/scenes/sticker-7-stamp-ignore-the-signs.webp}}", crown: "{{asset:img/v4/scenes/sticker-8-crown.webp}}"
  };
  // пропорции стикеров (ширина/высота) — место резервируется заранее
  var STAR = { crossout: .700, kapushon: .649, "new": .985, peek: .468, run: .899, shrug: .833, tape: .8, thumbsup: .766,
    "arrow-turn": 1.072, "arrow-zigzag": 1.056, "stop-crossed": 1.023, sparkle: .978, "noentry-crossed": 1.004, stars: .941, stamp: .998, crown: 1.317 };

  /* ---------- слоты ---------- */
  var SLOT = {
    preloader: { pose: "preloader" },
    hero: { pose: "hero" },   // hero и preloader рисует V1 сам (data-mascot-manual, видео — img/v4/hero/)
    menu: { pose: "menu" },
    cart: { pose: "cart-empty" },
    "404": { pose: "404" },
    footer: { pose: "footer", anim: "footer_swing" },
    subscribe: { pose: "subscribe" },
    next: { pose: "cart-add" }
  };
  var ALIAS = { cart: "cart-empty", empty: "cart-empty", add: "cart-add", sit: "footer", peek: "404", wave: "menu", head: "idle", stand: "idle", "hero-clean-sign": "hero" };

  var ua = navigator.userAgent || "";
  // VP9-альфа — Chromium/Firefox; WebKit (Safari и любой браузер на iOS) играет только HEVC-альфа
  var WEBKIT = /AppleWebKit/.test(ua) && !/(Chrome|Chromium|Edg|OPR|Android)\//.test(ua);
  // iOS/iPadOS (любой браузер там — WebKit): альфа-видео не играем — система ставит его на паузу и композитит с «коробкой»; поза + покачивание CSS
  var IOS = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var RMQ = W.matchMedia ? W.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var FINE = W.matchMedia ? W.matchMedia("(hover: hover) and (pointer: fine)") : { matches: false };
  function still() { return RMQ.matches || root.dataset.shot === "1"; }
  function axis() {
    var v = root.getAttribute("data-mascot") || "grinchin";
    return v === "none" || v === "quiet" ? v : "grinchin";   // старые значения v3 (kapushon/uhmyl) — как grinchin
  }
  function level() {
    var a = axis(); if (a === "none") return 0;
    var fx = root.dataset.mzfx;   // ось V1: calm | max; без оси — по режиму (2 = «максимум»)
    return fx ? (fx === "max" ? 2 : 1) : root.dataset.m === "2" ? 2 : 1;
  }
  function poseOf(n) { n = ALIAS[n] || n; return POSE[n] ? n : null; }
  function url(pose, h) { var p = POSE[poseOf(pose) || "idle"]; h = h || 720; return p[h <= 360 ? 1 : h <= 720 ? 2 : 3]; }
  function srcset(p) { return p[1] + " " + Math.round(360 * p[0]) + "w, " + p[2] + " " + Math.round(720 * p[0]) + "w, " + p[3] + " " + Math.round(1200 * p[0]) + "w"; }
  function animate(el, kf, o) { if (!el || !el.animate) return null; try { return el.animate(kf, o); } catch (e) { return null; } }

  var inst = [];
  var io = "IntersectionObserver" in W ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { var m = e.target.__mz; if (m) m.near(e.isIntersecting); });
  }, { rootMargin: "50% 0px 50% 0px" }) : null;

  function Mascot(el, o) {
    o = o || {};
    var slot = el.getAttribute("data-mascot-slot") || "";
    var def = SLOT[slot] || {};
    var a = axis();
    if (el.__mz) el.__mz.destroy();
    if (a === "none" || (a === "quiet" && slot !== "footer")) { el.hidden = true; el.innerHTML = ""; this.el = null; return; }
    el.hidden = false;
    this.el = el; this.slot = slot;
    this.pose = poseOf(o.pose || el.getAttribute("data-mascot-pose") || def.pose || slot) || def.pose || "idle";
    var an = o.anim !== undefined ? o.anim : (el.getAttribute("data-mascot-anim") || def.anim || null);
    this.anim = ANIM[an] && !IOS ? an : null;
    if (IOS && ANIM[an]) el.classList.add("mz-bob");
    this.once = o.once != null ? !!o.once : this.anim ? !ANIM[this.anim].loop : false;
    this.idle = o.idle || def.idle || (this.once ? "bob" : "none");
    this.live = !still() && a !== "quiet";
    this.vis = false; this.vid = null; this.done = false;
    el.classList.add("mz-slot");
    el.setAttribute("data-mz", this.pose);
    el.innerHTML = "";
    var box = (this.box = d.createElement("div"));
    box.className = "mz";
    var A = this.anim && ANIM[this.anim];
    if (A) {
      var bw = A.bb[2] - A.bb[0], bh = A.bb[3] - A.bb[1];
      box.style.aspectRatio = bw + " / " + bh;
      box.style.setProperty("--mz-vw", (A.fw / bw * 100).toFixed(3) + "%");
      box.style.setProperty("--mz-var", (A.fw / A.fh).toFixed(4));
      box.style.setProperty("--mz-vx", (-A.bb[0] / bw * 100).toFixed(3) + "%");
      box.style.setProperty("--mz-vy", (-A.bb[1] / bh * 100).toFixed(3) + "%");   // top в % — от высоты коробки
      el.style.setProperty("--mz-ar", (bw / bh).toFixed(4));
      if (A.seat) el.style.setProperty("--mz-seat", A.seat); else el.style.removeProperty("--mz-seat");
      // без движения: поза-концовка (hero → зачёркнутый знак), у петли без концовки — постер
      if (!this.live && A.end) this.img = this._pose(A.end);
      else this.img = this._img(A.poster, "mz-img mz-img--v");
    } else {
      box.style.aspectRatio = String(POSE[this.pose][0]);
      el.style.setProperty("--mz-ar", String(POSE[this.pose][0]));
      el.style.removeProperty("--mz-seat");
      this.img = this._pose(this.pose);
    }
    el.appendChild(box);
    el.__mz = this;
    inst.push(this);
    if (io) io.observe(el); else this.near(true);
  }
  Mascot.prototype._img = function (src, cls) {
    var im = d.createElement("img");
    im.className = cls; im.alt = ""; im.decoding = "async"; im.draggable = false;
    im.loading = this.slot === "hero" || this.slot === "preloader" ? "eager" : "lazy";
    im.src = src;
    this.box.appendChild(im);
    return im;
  };
  Mascot.prototype._pose = function (name) {
    var p = POSE[name], im = d.createElement("img");
    im.className = "mz-img"; im.alt = ""; im.decoding = "async"; im.draggable = false;
    im.loading = this.slot === "hero" || this.slot === "preloader" ? "eager" : "lazy";
    var w = Math.round(this.el.getBoundingClientRect().width) || 200;
    im.sizes = Math.min(1000, Math.max(100, w)) + "px";
    im.srcset = srcset(p); im.src = p[2];
    this.box.appendChild(im);
    return im;
  };
  Mascot.prototype.set = function (pose) {
    pose = poseOf(pose); if (!pose || !this.el || pose === this.pose && !this.anim) return this;
    this.stopVid();
    this.pose = pose; this.anim = null;
    this.el.setAttribute("data-mz", pose);
    this.box.style.aspectRatio = String(POSE[pose][0]);
    this.el.style.setProperty("--mz-ar", String(POSE[pose][0]));
    var old = this.img; this.img = this._pose(pose);
    if (old) old.remove();
    return this;
  };
  Mascot.prototype.near = function (on) {
    this.vis = on;
    // слот мог монтироваться скрытым (меню, 404, корзина) — sizes по реальной ширине, чтобы на DPR 2–3 не брать мелкий кадр
    if (on && this.img && this.img.srcset) { var w = Math.round(this.el.getBoundingClientRect().width); if (w > 20) this.img.sizes = Math.min(1000, w) + "px"; }
    if (!this.anim || !this.live || this.done) return;
    if (on) { this.loadVid(); if (this.vid && this.vid.paused) this._play(); }
    else if (this.vid) { if (!this.vid.paused) this.vid.pause(); this._live(false); }
  };
  Mascot.prototype.loadVid = function () {
    if (this.vid || !this.anim) return;
    var A = ANIM[this.anim], v = d.createElement("video"), self = this;
    v.className = "mz-vid"; v.muted = true; v.defaultMuted = true; v.playsInline = true;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
    v.preload = "auto"; v.loop = !!A.loop && !this.once; v.disablePictureInPicture = true;
    v.addEventListener("ended", function () { self.done = true; self.afterOnce(); });
    v.addEventListener("pause", function () { if (!v.ended) self._live(false); });   // пауза системой — постер в тот же кадр, не ждём сторожа
    v.addEventListener("error", function () { self.fail(); });
    v.src = WEBKIT ? A.mov : A.webm;
    this.vid = v;
    this.box.appendChild(v);
    // не стартовало за 5 с — остаёмся на позе-концовке (не висим на первом кадре)
    this._fb = setTimeout(function () { if (!self._got) self.fail(); }, 5000);
  };
  Mascot.prototype._play = function () {
    var v = this.vid, self = this; if (!v || d.hidden) return;
    var p = v.play(); if (p && p.catch) p.catch(function (e) { if (!e || e.name !== "AbortError") self.fail(); });
    this._arm();
  };
  /* v4.2 (M1): видео видно (.is-play — постер прячется) ТОЛЬКО пока у него реально идут кадры: первый показанный кадр —
     requestVideoFrameCallback (без него — сдвиг currentTime + 2 кадра), дальше сторож раз в 300 мс: пауза / фон / кадры
     стоят 0,9 с → снова постер. Раньше .is-play ставился по «playing» навсегда: после паузы системой (фон, переход в Telegram)
     iOS мог оставить слой пустым — у альфа-видео это «маскот пропал». */
  Mascot.prototype._arm = function () {
    var v = this.vid, self = this; if (!v) return;
    var hit = function () { if (self.vid !== v) return; if (v.paused) { self._arm(); return; } clearTimeout(self._fb); self._got = true; self._live(true); };
    if (v.requestVideoFrameCallback) { if (!v.__rvfc) { v.__rvfc = 1; v.requestVideoFrameCallback(function () { v.__rvfc = 0; hit(); }); } return; }
    var t0 = v.currentTime, k = function () { if (v.currentTime !== t0) { v.removeEventListener("timeupdate", k); W.requestAnimationFrame(function () { W.requestAnimationFrame(hit); }); } };
    v.addEventListener("timeupdate", k);
  };
  Mascot.prototype._live = function (on) {
    var self = this, v = this.vid; if (!this.box) return;
    clearInterval(this._wd);
    if (!on || !v) { this.box.classList.remove("is-play"); if (v && !v.paused && !d.hidden) this._arm(); return; }   // кадры встали, но не пауза — ждём следующий
    this.box.classList.add("is-play");
    var ct = v.currentTime, t = Date.now();
    this._wd = setInterval(function () {
      if (self.vid !== v) { clearInterval(self._wd); return; }
      if (v.ended) return;   // «один раз» — последний кадр стоит
      var n = Date.now(); if (v.currentTime !== ct) { ct = v.currentTime; t = n; if (!v.paused && !d.hidden) return; }
      if (v.paused || d.hidden || n - t > 900) self._live(false);
    }, 300);
  };
  Mascot.prototype.fail = function () {
    clearTimeout(this._fb);
    var A = this.anim && ANIM[this.anim];
    this.stopVid();
    if (A && A.end) { var old = this.img; this.img = this._pose(A.end); if (old) old.remove(); }
    this.done = true; this.afterOnce();
  };
  Mascot.prototype.stopVid = function () {
    clearTimeout(this._fb); clearInterval(this._wd);
    if (this.vid) { try { this.vid.pause(); this.vid.removeAttribute("src"); this.vid.load(); } catch (e) {} this.vid.remove(); this.vid = null; }
    if (this.box) this.box.classList.remove("is-play");
  };
  Mascot.prototype.afterOnce = function () {
    if (!this.live || this._after) return;
    this._after = true;
    if (this.idle === "bob") this.el.classList.add("mz-bob");
  };
  Mascot.prototype.hop = function (k) {
    if (!this.live) return;
    k = k || 1;
    animate(this.box, [{ transform: "none" }, { transform: "translateY(" + (-7 * k) + "%) rotate(" + (-3 * k) + "deg)", offset: .35 },
      { transform: "translateY(0) rotate(" + (2 * k) + "deg)", offset: .7 }, { transform: "none" }], { duration: 520, easing: "cubic-bezier(.3,.7,.4,1)" });
  };
  Mascot.prototype.wiggle = function () {
    if (!this.live) return;
    animate(this.box, [{ transform: "none" }, { transform: "rotate(-4deg)" }, { transform: "rotate(3deg)" }, { transform: "rotate(-2deg)" }, { transform: "none" }],
      { duration: 700, easing: "ease-in-out" });
  };
  // въезд из-за края / снизу (меню, 404, корзина)
  Mascot.prototype.enter = function (from, delay) {
    if (!this.live) return;
    var t = from === "right" ? "translateX(60%) rotate(10deg)" : from === "left" ? "translateX(-60%) rotate(-10deg)" : "translateY(40%)";
    animate(this.box, [{ transform: t, opacity: 0 }, { opacity: 1, offset: .2 }, { transform: "none", opacity: 1 }],
      { duration: 640, delay: delay || 0, easing: "cubic-bezier(.2,1.3,.35,1)", fill: "backwards" });
  };
  Mascot.prototype.react = function (ev) {
    switch (ev) {
      case "add": if (this.slot === "cart") { this.set("cart-add"); this.hop(1.2); } else this.hop(); break;
      case "empty": if (this.slot === "cart" && this.pose !== "cart-empty") this.set("cart-empty"); break;
      case "subscribe": if (this.slot === "subscribe") { this.set("cart-add"); this.hop(1.3); } break;
      case "wave": this.wiggle(); break;
      case "hop": this.hop(); break;
    }
    return this;
  };
  Mascot.prototype.destroy = function () {
    this.stopVid();
    if (io && this.el) io.unobserve(this.el);
    var i = inst.indexOf(this); if (i >= 0) inst.splice(i, 1);
    if (this.el) { this.el.__mz = null; this.el.innerHTML = ""; this.el.classList.remove("mz-bob"); }
  };

  function mount(el, o) {
    if (!el) return null;
    if (el.__mz && !o) return el.__mz;
    var m = new Mascot(el, o);
    return m.el ? m : null;
  }
  function scan(ctx) {
    var list = (ctx || d).querySelectorAll ? (ctx || d).querySelectorAll("[data-mascot-slot]") : [];
    for (var i = 0; i < list.length; i++) if (!list[i].__mz && !list[i].hasAttribute("data-mascot-manual")) mount(list[i]);
  }
  function each(fn, f) { inst.slice().forEach(function (m) { if (!f || f(m)) fn(m); }); }

  /* ---------- всплывающий маскот: «добавил в корзину» (1,2 с, ничего не ловит) ---------- */
  var popEl = null, popAnim = null, popT = 0;
  function pop(pose, ms) {
    if (level() === 0 || axis() === "quiet") return;
    pose = poseOf(pose || "cart-add") || "cart-add"; ms = ms || 1200;
    if (!popEl) {
      popEl = d.createElement("div"); popEl.className = "mz-pop"; popEl.setAttribute("aria-hidden", "true");
      popEl.innerHTML = '<img alt="" decoding="async" draggable="false">';
      d.body.appendChild(popEl);
    }
    var im = popEl.firstChild, p = POSE[pose];
    if (im.getAttribute("data-p") !== pose) { im.sizes = "200px"; im.srcset = srcset(p); im.src = p[2]; im.setAttribute("data-p", pose); }
    popEl.style.aspectRatio = String(p[0]);
    clearTimeout(popT);
    var go = function () {
      if (popAnim) popAnim.cancel();
      popEl.classList.add("is-on");
      popAnim = animate(popEl, still() ?
        [{ opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: 1, offset: .88 }, { opacity: 0 }] :
        [{ transform: "translateY(105%) rotate(8deg)", easing: "cubic-bezier(.2,1.35,.4,1)" }, { transform: "translateY(0) rotate(0)", offset: .26 },
         { transform: "translateY(0) rotate(0)", offset: .8, easing: "cubic-bezier(.55,0,.85,.35)" }, { transform: "translateY(110%) rotate(5deg)" }],
        { duration: ms, fill: "both" });   // плавность — по ключам (общий easing растягивал выезд на всю длительность)
      popT = setTimeout(function () { popEl.classList.remove("is-on"); if (popAnim) { popAnim.cancel(); popAnim = null; } }, ms + 40);
    };
    // первый раз — ждём декод (до 450 мс), чтобы не выехала пустая рамка
    if (im.complete && im.naturalWidth) go();
    else Promise.race([im.decode ? im.decode().catch(function () {}) : Promise.resolve(), new Promise(function (r) { setTimeout(r, 450); })]).then(go);
  }

  /* ---------- события ---------- */
  function init() {
    scan();
    if ("MutationObserver" in W) {
      var pend = false;
      new MutationObserver(function (rs) {
        if (pend) return;
        for (var i = 0; i < rs.length; i++) {
          var a = rs[i].addedNodes;
          for (var j = 0; j < a.length; j++) {
            var n = a[j];
            if (n.nodeType === 1 && (n.hasAttribute("data-mascot-slot") || n.querySelector("[data-mascot-slot]"))) {
              pend = true; Promise.resolve().then(function () { pend = false; scan(); }); return;
            }
          }
        }
      }).observe(d.body, { childList: true, subtree: true });
    }
    d.addEventListener("grinchin:add", function () {
      var shown = false;
      each(function (m) { if (m.el.offsetParent) { shown = true; m.react("add"); } }, function (m) { return m.slot === "cart"; });
      if (!shown) pop("cart-add", 1200);
    });
    d.addEventListener("grinchin:cart", function (e) {
      if (!(e.detail && e.detail.count)) each(function (m) { m.react("empty"); }, function (m) { return m.slot === "cart"; });
    });
    d.addEventListener("grinchin:subscribe", function () { each(function (m) { m.react("subscribe"); }); });
    d.addEventListener("grinchin:overlay", function (e) {
      var x = e.detail || {}; if (!x.open) return;
      setTimeout(function () {
        if (x.name === "menu") each(function (m) { m.enter("right", 140); if (level() > 1) setTimeout(function () { m.wiggle(); }, 950); }, function (m) { return m.slot === "menu"; });
        if (x.name === "404") each(function (m) { m.enter("bottom", 220); }, function (m) { return m.slot === "404"; });
        if (x.name === "cart") each(function (m) { m.enter("bottom", 160); }, function (m) { return m.slot === "cart"; });
      }, 30);
    });
    d.addEventListener("grinchin:mode", function (e) {   // живое переключение оси (GV.mode.live('mascot'))
      var x = e.detail || {}; if (x.axis !== "mascot" && x.axis !== "mzfx") return;
      var all = d.querySelectorAll("[data-mascot-slot]");
      for (var i = 0; i < all.length; i++) {
        var el = all[i]; if (el.__mz) el.__mz.destroy();
        el.hidden = false; el.innerHTML = "";
        if (!el.hasAttribute("data-mascot-manual")) mount(el);
      }
    });
    // фон вкладки / переход в другое приложение / «назад» (bfcache): видео на паузу и сразу постер; вернулся — играем заново
    var away = function () { each(function (m) { if (m.vid) { m.vid.pause(); m._live(false); } }); };
    var back = function () { each(function (m) { if (m.vis && m.vid && m.live && !m.done && m.vid.paused) m._play(); }); };
    d.addEventListener("visibilitychange", function () { if (d.hidden) away(); else back(); });
    W.addEventListener("pagehide", away);
    W.addEventListener("pageshow", function (e) { if (e.persisted) back(); });
    // наведение — подпрыгивает
    if (FINE.matches) d.addEventListener("pointerover", function (e) {
      var t = e.target.closest && e.target.closest(".mz-slot"); if (!t || !t.__mz || t.__mzH) return;
      t.__mzH = 1; setTimeout(function () { t.__mzH = 0; }, 1400);
      var m = t.__mz;
      m.hop(0.8);
    });
    // «максимум»: раз в 7–12 с случайный видимый маскот (без видео) встряхивается
    if (level() > 1 && !still()) (function tick() {
      setTimeout(function () {
        if (!d.hidden) { var v = inst.filter(function (m) { return m.vis && m.live && !m.vid; }); if (v.length) v[(Math.random() * v.length) | 0].wiggle(); }
        tick();
      }, 7000 + Math.random() * 5000);
    })();
    if (GV.mode && GV.mode.live) try { GV.mode.live("mascot"); } catch (e) {}
  }

  GV.mascot = {
    v: 4, mount: mount, scan: scan, pop: pop, list: inst, level: level, axis: axis,
    react: function (ev) { each(function (m) { m.react(ev); }); },
    url: url, poses: Object.keys(POSE), anims: Object.keys(ANIM),
    sticker: function (n) { return ST[n] || null; }, stickers: ST, stickerAR: STAR,
    meta: function (n) { return ANIM[n] ? { bb: ANIM[n].bb.slice(), seat: ANIM[n].seat || null, end: ANIM[n].end } : POSE[poseOf(n)] ? { ar: POSE[poseOf(n)][0] } : null; }
  };
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})();
