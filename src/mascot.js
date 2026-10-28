/* GRINCHIN v5 · маскот по слотам (B2) → window.GV.mascot
   Позы — статичные картинки с альфой (img/v5/mascot, webp + png-запас, по высоте 720/1200), БЕЗ видео: старые видео v4
   (hero_crossout, footer_swing, preloader_peek) и позы v4 (img/v4/mascot) не грузятся ни в одном слоте — файлы сохранены.
   Слоты [data-mascot-slot]: footer (пушистый на ONE WAY) · cart (cart-empty) · menu (из-за правого края) · subscribe
   (subscribe → subscribed) · 404 · account (вход/пустые разделы; data-mascot-pose="bye" — удаление/выход).
   Реакция «добавил в корзину» — GV.mascot.pop('cart-add'): всплывает у правого нижнего края, ~1,9 с.

   Плавность (v5): поза показывается ТОЛЬКО после декода картинки (img.decode) — без мигания пустого места и подгрузки
   «на глазах»; въезд (enter) ждёт декод, а не играет по пустой коробке. Позы меню / корзины / «добавил» / «подписан»
   предзагружаются и декодируются в простое после загрузки страницы — к открытию всё готово.
   Движение — только transform/opacity (WAAPI + CSS), мягкие easing. reduced-motion и ?shot=1 — статично (без покачивания).

   API (совместим с v4): mount(el,{pose}) → {set, react, hop, wiggle, enter, ready, destroy} · pop(pose, ms) · react(ev) ·
   url(pose,h) · poses · preload(names) · sticker(name)/stickers/stickerAR (стикеры — не маскот, остались v4).
   Ось html[data-mascot]: grinchin — везде · quiet — только подвал, статично · none — нигде. */
(function () {
  "use strict";
  var d = document, root = d.documentElement, W = window;
  var GV = (W.GV = W.GV || {});
  if (GV.mascot && GV.mascot.v === 5) return;

  /* ---------- ассеты (пути раскрывает build.py) ---------- */
  // поза: [ширина/высота, webp h720, webp h1200, png h720, png h1200]
  // build.py раскрывает только литералы — пути выписаны целиком
  var POSE = {
    footer: [0.7729, "{{asset:img/v5/mascot/footer-720.webp}}", "{{asset:img/v5/mascot/footer-1200.webp}}", "{{asset:img/v5/mascot/footer-720.png}}", "{{asset:img/v5/mascot/footer-1200.png}}"],
    "cart-empty": [0.7847, "{{asset:img/v5/mascot/cart-empty-720.webp}}", "{{asset:img/v5/mascot/cart-empty-1200.webp}}", "{{asset:img/v5/mascot/cart-empty-720.png}}", "{{asset:img/v5/mascot/cart-empty-1200.png}}"],
    "cart-add": [0.677, "{{asset:img/v5/mascot/cart-add-720.webp}}", "{{asset:img/v5/mascot/cart-add-1200.webp}}", "{{asset:img/v5/mascot/cart-add-720.png}}", "{{asset:img/v5/mascot/cart-add-1200.png}}"],
    menu: [0.4659, "{{asset:img/v5/mascot/menu-720.webp}}", "{{asset:img/v5/mascot/menu-1200.webp}}", "{{asset:img/v5/mascot/menu-720.png}}", "{{asset:img/v5/mascot/menu-1200.png}}"],
    subscribe: [0.6131, "{{asset:img/v5/mascot/subscribe-720.webp}}", "{{asset:img/v5/mascot/subscribe-1200.webp}}", "{{asset:img/v5/mascot/subscribe-720.png}}", "{{asset:img/v5/mascot/subscribe-1200.png}}"],
    subscribed: [0.5353, "{{asset:img/v5/mascot/subscribed-720.webp}}", "{{asset:img/v5/mascot/subscribed-1200.webp}}", "{{asset:img/v5/mascot/subscribed-720.png}}", "{{asset:img/v5/mascot/subscribed-1200.png}}"],
    "404": [0.7936, "{{asset:img/v5/mascot/404-720.webp}}", "{{asset:img/v5/mascot/404-1200.webp}}", "{{asset:img/v5/mascot/404-720.png}}", "{{asset:img/v5/mascot/404-1200.png}}"],
    account: [0.5412, "{{asset:img/v5/mascot/account-720.webp}}", "{{asset:img/v5/mascot/account-1200.webp}}", "{{asset:img/v5/mascot/account-720.png}}", "{{asset:img/v5/mascot/account-1200.png}}"],
    bye: [0.563, "{{asset:img/v5/mascot/bye-720.webp}}", "{{asset:img/v5/mascot/bye-1200.webp}}", "{{asset:img/v5/mascot/bye-720.png}}", "{{asset:img/v5/mascot/bye-1200.png}}"]
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
  var STAR = { crossout: .700, kapushon: .649, "new": .985, peek: .468, run: .899, shrug: .833, tape: .8, thumbsup: .766,
    "arrow-turn": 1.072, "arrow-zigzag": 1.056, "stop-crossed": 1.023, sparkle: .978, "noentry-crossed": 1.004, stars: .941, stamp: .998, crown: 1.317 };

  /* слот → поза, sizes (ширина слота в CSS, чтобы выбор кадра совпадал с предзагрузкой), покой */
  var SLOT = {
    footer: { pose: "footer", sizes: "(min-width:1100px) 300px, (min-width:768px) 26vw, min(56vw, 220px)", idle: "sway" },
    cart: { pose: "cart-empty", sizes: "(min-width:500px) 180px, 36vw", idle: "bob" },
    menu: { pose: "menu", sizes: "(min-width:1100px) 150px, (min-width:768px) 112px, 92px", idle: "none" },
    subscribe: { pose: "subscribe", sizes: "(min-width:1100px) 150px, 96px", idle: "bob" },
    "404": { pose: "404", sizes: "(max-aspect-ratio:4/5) 40vw, 22vw", idle: "bob" },
    account: { pose: "account", sizes: "(min-width:480px) 132px, 28vw", idle: "bob" }
  };
  var POP_SIZES = "(min-width:768px) 172px, 128px";
  var ALIAS = { cart: "cart-empty", empty: "cart-empty", add: "cart-add", sit: "footer", peek: "menu", wave: "bye", login: "account", idle: "account" };

  var RMQ = W.matchMedia ? W.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var FINE = W.matchMedia ? W.matchMedia("(hover: hover) and (pointer: fine)") : { matches: false };
  function still() { return RMQ.matches || root.dataset.shot === "1"; }
  function axis() { var v = root.getAttribute("data-mascot") || "grinchin"; return v === "none" || v === "quiet" ? v : "grinchin"; }
  function level() { var a = axis(); if (a === "none") return 0; var fx = root.dataset.mzfx; return fx ? (fx === "max" ? 2 : 1) : root.dataset.m === "2" ? 2 : 1; }
  function poseOf(n) { n = ALIAS[n] || n; return POSE[n] ? n : null; }
  function url(pose, h) { var p = POSE[poseOf(pose) || "account"]; return (h || 720) <= 720 ? p[1] : p[2]; }
  function srcset(p, png) { var i = png ? 3 : 1; return p[i] + " " + Math.round(720 * p[0]) + "w, " + p[i + 1] + " " + Math.round(1200 * p[0]) + "w"; }
  function animate(el, kf, o) { if (!el || !el.animate) return null; try { return el.animate(kf, o); } catch (e) { return null; } }
  var EASE_OUT = "cubic-bezier(.22,1,.36,1)", EASE_BACK = "cubic-bezier(.34,1.42,.64,1)", EASE_IN = "cubic-bezier(.55,0,.75,.2)";

  /* ---------- картинка позы: srcset + запасной png + промис «декодирована» ---------- */
  var cache = {};   // pose|sizes → Image (предзагрузка: держим ссылку, чтобы декод не выкинули)
  function makeImg(pose, sizes, cls, defer) {
    var p = POSE[pose], im = d.createElement("img");
    im.className = cls || "mz-img"; im.alt = ""; im.decoding = "async"; im.draggable = false;
    im.__arm = function () { if (im.__armed) return; im.__armed = 1; im.sizes = sizes; im.srcset = srcset(p); im.src = p[1]; };
    if (!defer) im.__arm();
    im.onerror = function () { if (im.__png) return; im.__png = 1; im.srcset = srcset(p, true); im.src = p[3]; };   // webp не взлетел — png
    return im;
  }
  function decoded(im, cap) {
    var done = new Promise(function (res) {
      var ok = function () { if (im.decode) im.decode().then(res, res); else res(); };
      if (im.complete && im.naturalWidth) ok();
      else { im.addEventListener("load", ok, { once: true }); im.addEventListener("error", function () { setTimeout(function () { if (im.complete && im.naturalWidth) ok(); }, 50); }, { once: false }); }
    });
    return cap ? Promise.race([done, new Promise(function (r) { setTimeout(r, cap); })]) : done;
  }
  function preload(list) {
    (list || []).forEach(function (it) {
      var pose = poseOf(it[0]), k = pose + "|" + it[1]; if (!pose || cache[k]) return;
      var im = makeImg(pose, it[1]); cache[k] = im; decoded(im);
    });
  }

  var inst = [];
  var io = "IntersectionObserver" in W ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { var m = e.target.__mz; if (m) m.near(e.isIntersecting); });
  }, { rootMargin: "60% 0px 60% 0px" }) : null;

  function Mascot(el, o) {
    o = o || {};
    var slot = el.getAttribute("data-mascot-slot") || "";
    var def = SLOT[slot] || SLOT.account;
    var a = axis();
    if (el.__mz) el.__mz.destroy();
    if (a === "none" || (a === "quiet" && slot !== "footer")) { el.hidden = true; el.innerHTML = ""; this.el = null; return; }
    el.hidden = false;
    this.el = el; this.slot = slot; this.sizes = def.sizes;
    this.pose = poseOf(o.pose || el.getAttribute("data-mascot-pose") || def.pose) || def.pose;
    this.idle = o.idle || def.idle;
    this.live = !still() && a !== "quiet";
    this.vis = false;
    el.classList.add("mz-slot");
    el.setAttribute("data-mz", this.pose);
    el.innerHTML = "";
    var box = (this.box = d.createElement("div"));
    box.className = "mz is-wait";
    box.style.aspectRatio = String(POSE[this.pose][0]);
    el.style.setProperty("--mz-ar", String(POSE[this.pose][0]));
    // поза грузится, только когда слот рядом с экраном (подвал, подписка) или открыт его оверлей (меню, 404) —
    // не отнимает канал у hero на медленной сети; меню/корзина/«добавил» к тому времени уже лежат в кэше (предзагрузка).
    // Сами (не loading=lazy): WebKit грузит lazy-картинки и внутри скрытых оверлеев
    this.img = makeImg(this.pose, this.sizes, "mz-img", true);
    box.appendChild(this.img);
    el.appendChild(box);
    el.__mz = this;
    var self = this;
    // показ — только после декода: коробка держит место (aspect-ratio), картинка проявляется целиком
    this.ready = decoded(this.img).then(function () {
      if (!self.box) return;
      self.box.classList.remove("is-wait");
      if (self.live && self.idle !== "none") self.el.classList.add("mz-" + self.idle);
    });
    inst.push(this);
    if (io) io.observe(el); else this.near(true);
  }
  Mascot.prototype.near = function (on) { this.vis = on; if (on && this.img) this.img.__arm(); };
  // смена позы: новая декодируется скрыто, затем мягкая смена (старая гаснет, новая проявляется)
  Mascot.prototype.set = function (pose, fx) {
    pose = poseOf(pose); if (!pose || !this.el || pose === this.pose) return Promise.resolve(this);
    var self = this, nim = makeImg(pose, this.sizes, "mz-img is-next");
    this.pose = pose; this.el.setAttribute("data-mz", pose);
    this.box.appendChild(nim);
    return decoded(nim, 4000).then(function () {
      if (!self.box || self.pose !== pose) { nim.remove(); return self; }
      var old = self.img; self.img = nim;
      self.box.style.aspectRatio = String(POSE[pose][0]);
      self.el.style.setProperty("--mz-ar", String(POSE[pose][0]));
      nim.classList.remove("is-next");
      if (self.live) {
        animate(nim, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "ease-out" });
        if (old) { var an = animate(old, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease-in", fill: "forwards" }); if (an) an.onfinish = function () { old.remove(); }; else old.remove(); }
        if (fx !== false) self.hop(1.15);
      } else if (old) old.remove();
      return self;
    });
  };
  Mascot.prototype.hop = function (k) {
    if (!this.live || !this.box) return;
    k = k || 1;
    animate(this.box, [{ transform: "none" }, { transform: "translateY(" + (-6 * k) + "%) rotate(" + (-2.5 * k) + "deg)", offset: .38, easing: "cubic-bezier(.3,0,.5,1)" },
      { transform: "translateY(0) rotate(" + (1.5 * k) + "deg)", offset: .72, easing: "cubic-bezier(.3,0,.4,1)" }, { transform: "none" }], { duration: 640, easing: EASE_OUT, composite: "add" });
  };
  Mascot.prototype.wiggle = function () {
    if (!this.live || !this.box) return;
    animate(this.box, [{ transform: "none" }, { transform: "rotate(-3deg)" }, { transform: "rotate(2deg)" }, { transform: "rotate(-1deg)" }, { transform: "none" }],
      { duration: 900, easing: "ease-in-out", composite: "add" });
  };
  // въезд: ждёт декод, затем играет; из-за правого края (меню) — точка опоры правый нижний угол
  Mascot.prototype.enter = function (from, delay) {
    var self = this; if (!this.box) return;
    var t0 = Date.now();
    this.box.classList.add("is-hold");   // до въезда коробка скрыта — не мелькает в конечной точке
    if (this.img) this.img.__arm();
    this.ready.then(function () {
      if (!self.box) return;
      var late = Math.max(0, (delay || 0) - (Date.now() - t0));
      if (!self.live) { self.box.classList.remove("is-hold"); return; }
      var kf = from === "right"
        ? [{ transform: "translateX(70%) rotate(8deg)", opacity: 1 }, { transform: "translateX(-4%) rotate(-1.5deg)", offset: .62 }, { transform: "none", opacity: 1 }]
        : [{ transform: "translateY(18%) scale(.94)", opacity: 0 }, { opacity: 1, offset: .35 }, { transform: "translateY(-2%) scale(1.01)", offset: .7 }, { transform: "none", opacity: 1 }];
      var an = animate(self.box, kf, { duration: from === "right" ? 760 : 620, delay: late, easing: from === "right" ? EASE_OUT : EASE_OUT, fill: "backwards" });
      self.box.classList.remove("is-hold");
      if (!an) return;
    });
  };
  Mascot.prototype.react = function (ev) {
    switch (ev) {
      case "subscribe": if (this.slot === "subscribe") this.set("subscribed"); break;
      case "wave": this.wiggle(); break;
      case "hop": this.hop(); break;
    }
    return this;
  };
  Mascot.prototype.destroy = function () {
    if (io && this.el) io.unobserve(this.el);
    var i = inst.indexOf(this); if (i >= 0) inst.splice(i, 1);
    if (this.el) { this.el.__mz = null; this.el.innerHTML = ""; this.el.classList.remove("mz-bob", "mz-sway"); }
    this.box = null;
  };

  function mount(el, o) {
    if (!el) return null;
    if (el.__mz && !o) return el.__mz;
    if (el.__mz && o && poseOf(o.pose) === el.__mz.pose) return el.__mz;
    var m = new Mascot(el, o);
    return m.el ? m : null;
  }
  function scan(ctx) {
    var list = (ctx || d).querySelectorAll ? (ctx || d).querySelectorAll("[data-mascot-slot]") : [];
    for (var i = 0; i < list.length; i++) if (!list[i].__mz && !list[i].hasAttribute("data-mascot-manual")) mount(list[i]);
  }
  function each(fn, f) { inst.slice().forEach(function (m) { if (!f || f(m)) fn(m); }); }

  /* ---------- «добавил в корзину»: выезд снизу справа, держится ~1,2 с, уезжает; всего ~1,9 с ---------- */
  var popEl = null, popAnim = null, popT = 0, popSeq = 0;
  function pop(pose, ms) {
    if (level() === 0 || axis() === "quiet") return;
    pose = poseOf(pose || "cart-add") || "cart-add"; ms = ms || 1900;
    if (!popEl) {
      popEl = d.createElement("div"); popEl.className = "mz-pop"; popEl.setAttribute("aria-hidden", "true");
      d.body.appendChild(popEl);
    }
    var im = popEl.firstChild;
    if (!im || im.getAttribute("data-p") !== pose) {
      var c = cache[pose + "|" + POP_SIZES];
      im = makeImg(pose, POP_SIZES, ""); im.setAttribute("data-p", pose);
      if (c && c.currentSrc) im.src = c.currentSrc;   // тот же кадр, что уже декодирован в простое
      popEl.innerHTML = ""; popEl.appendChild(im);
    }
    popEl.style.aspectRatio = String(POSE[pose][0]);
    var seq = ++popSeq, t0 = Date.now();
    var go = function () {
      if (seq !== popSeq) return;
      if (Date.now() - t0 > 1600) return;   // кадр так и не успел — реакция устарела, не показываем «вдогонку»
      clearTimeout(popT);
      if (popAnim) popAnim.cancel();
      popEl.classList.add("is-on");
      popAnim = animate(popEl, still() ?
        [{ opacity: 0, transform: "none" }, { opacity: 1, transform: "none", offset: .08 }, { opacity: 1, transform: "none", offset: .9 }, { opacity: 0, transform: "none" }] :
        [{ transform: "translateY(108%) rotate(9deg)", easing: EASE_BACK },
         { transform: "translateY(0) rotate(-2deg)", offset: .24, easing: "ease-in-out" },
         { transform: "translateY(-1.5%) rotate(1.5deg)", offset: .44, easing: "ease-in-out" },
         { transform: "translateY(0) rotate(0)", offset: .62, easing: "ease-in-out" },
         { transform: "translateY(0) rotate(0)", offset: .8, easing: EASE_IN },
         { transform: "translateY(112%) rotate(6deg)" }],
        { duration: ms, fill: "both" });
      popT = setTimeout(function () { popEl.classList.remove("is-on"); if (popAnim) { popAnim.cancel(); popAnim = null; } }, ms + 40);
    };
    decoded(im).then(go);
  }

  /* ---------- предзагрузка в простое: меню, корзина, «добавил», «подписан» ---------- */
  function idlePreload() {
    if (axis() !== "grinchin") return;
    var ric = W.requestIdleCallback || function (f) { return setTimeout(f, 300); };
    ric(function () {
      preload([["menu", SLOT.menu.sizes], ["cart-add", POP_SIZES], ["cart-empty", SLOT.cart.sizes]]);
      ric(function () { preload([["subscribed", SLOT.subscribe.sizes], ["account", SLOT.account.sizes]]); }, { timeout: 4000 });
    }, { timeout: 2500 });
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
    d.addEventListener("grinchin:add", function () { pop("cart-add"); });
    d.addEventListener("grinchin:subscribe", function () { each(function (m) { m.react("subscribe"); }); });
    d.addEventListener("grinchin:overlay", function (e) {
      var x = e.detail || {}; if (!x.open) return;
      var slot = x.name === "menu" ? "menu" : x.name === "404" ? "404" : x.name === "cart" ? "cart" : null;
      if (!slot) return;
      each(function (m) { m.enter(slot === "menu" ? "right" : "bottom", slot === "menu" ? 260 : 200); }, function (m) { return m.slot === slot; });
    });
    d.addEventListener("grinchin:mode", function (e) {
      var x = e.detail || {}; if (x.axis !== "mascot" && x.axis !== "mzfx") return;
      var all = d.querySelectorAll("[data-mascot-slot]");
      for (var i = 0; i < all.length; i++) {
        var el = all[i]; if (el.__mz) el.__mz.destroy();
        el.hidden = false; el.innerHTML = "";
        if (!el.hasAttribute("data-mascot-manual")) mount(el);
      }
    });
    if (FINE.matches) d.addEventListener("pointerover", function (e) {
      var t = e.target.closest && e.target.closest(".mz-slot"); if (!t || !t.__mz || t.__mzH) return;
      t.__mzH = 1; setTimeout(function () { t.__mzH = 0; }, 1600);
      t.__mz.hop(0.7);
    });
    if (d.readyState === "complete") idlePreload(); else W.addEventListener("load", idlePreload, { once: true });
    if (GV.mode && GV.mode.live) try { GV.mode.live("mascot"); } catch (e) {}
  }

  GV.mascot = {
    v: 5, mount: mount, scan: scan, pop: pop, preload: preload, list: inst, level: level, axis: axis,
    react: function (ev) { each(function (m) { m.react(ev); }); },
    url: url, poses: Object.keys(POSE), anims: [],
    sticker: function (n) { return ST[n] || null; }, stickers: ST, stickerAR: STAR,
    meta: function (n) { return POSE[poseOf(n)] ? { ar: POSE[poseOf(n)][0] } : null; }
  };
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})();
