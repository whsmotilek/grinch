/* GRINCHIN v2 · финал страницы (K5) → window.GV.end
   1) «Разобрали — вернём»: Telegram/Почта, валидация, успех — пакет и две ленты «прилепляются» крест-накрест.
      Сетевых запросов нет. Шлёт grinchin:subscribe {channel: 'telegram'|'email'}.
   2) Подвал: ленивая бумага, совмещение заломов лого с фоном, «Размерная сетка» → GV.open('sizes').
   3) 404: при открытии зовёт GV.motion.play404(el), если K4 её дал; иначе статичная улыбка. */
(function () {
  "use strict";
  var d = document, root = d.documentElement;
  var GV = (window.GV = window.GV || {});
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  function instant() { return mq.matches || root.dataset.shot === "1"; }
  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }

  /* ленивые картинки по data-src: грузим, когда раздел в ~1,5 экрана */
  function near(el, fn) {
    if (!el) return;
    if (root.dataset.shot === "1" || !("IntersectionObserver" in window)) { fn(); return; }
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); fn(); }
    }, { rootMargin: "1500px 0px" });
    io.observe(el);
  }

  /* ================= подписка ================= */
  var CH = {
    telegram: { label: "ник:", ph: "@ник", type: "text", mode: "text", ac: "username", done: "Напишем в\u00a0Telegram.",
      ok: function (v) { return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(v.replace(/^(https?:\/\/)?(t\.me\/|telegram\.me\/)/i, "").replace(/^@/, "")); },
      bad: "Ник\u00a0— от\u00a05 символов: латиница, цифры, _." },
    email: { label: "почта:", ph: "имя@почта.ру", type: "email", mode: "email", ac: "email", done: "Напишем на\u00a0почту.",
      ok: function (v) { return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/.test(v); },
      bad: "В\u00a0почте опечатка?" }
  };
  var EMPTY = "Нужен ник или почта.";
  var sec = d.getElementById("next");
  var form = $("[data-nx-form]", sec || d);
  var done = $("[data-nx-done]", sec || d);
  var bagLoaded = null;

  function loadBag() {
    if (bagLoaded) return bagLoaded;
    var imgs = $$("img[data-src]", done);
    $$("source[data-srcset]", done).forEach(function (s) { s.srcset = s.dataset.srcset; s.removeAttribute("data-srcset"); });
    imgs.forEach(function (i) { i.src = i.dataset.src; i.removeAttribute("data-src"); });
    var all = $$("img", done).map(function (i) {
      return (i.decode ? i.decode() : Promise.resolve()).catch(function () {});
    });
    bagLoaded = Promise.all(all);
    return bagLoaded;
  }

  function channel() { var r = form && $('input[name="nx-ch"]:checked', form); return r ? r.value : "telegram"; }
  function setErr(msg) {
    var inp = $("[data-nx-input]", form), err = $("[data-nx-err]", form);
    err.textContent = msg || "";
    if (msg) inp.setAttribute("aria-invalid", "true"); else inp.removeAttribute("aria-invalid");
  }

  function slap(tape, sh, delay, rot) {
    var ease = "cubic-bezier(.25,1.15,.4,1)";
    tape.animate([
      { opacity: 0, transform: "translate(0,-16px) scale(1.07) rotate(" + rot + "deg)" },
      { opacity: 1, offset: .45, transform: "translate(0,1px) scale(.994) rotate(0deg)" },
      { opacity: 1, transform: "none" }
    ], { duration: 360, delay: delay, easing: ease, fill: "backwards" });
    // тень родится вместе с лентой (не раньше: иначе ~150 мс на пакете висит тёмное пятно), пик — пока лента в воздухе
    sh.animate([
      { opacity: 0, transform: "translate(0,22px) scale(1.08)" },
      { opacity: .42, offset: .2, transform: "translate(0,16px) scale(1.06)" },
      { opacity: 0, transform: "translate(0,2px) scale(1)" }
    ], { duration: 360, delay: delay, easing: ease, fill: "both" });
  }

  function showDone(ch) {
    var c = CH[ch];
    $("[data-nx-done-text]", done).textContent = c.done;
    var go = function () {
      form.hidden = true;
      done.hidden = false;
      var t = $("[data-nx-done-title]", done);
      t.focus({ preventScroll: true });
      if (instant() || !done.animate) return;
      var bag = $(".nx-bag-base", done), txt = $(".nx-done-txt", done);
      bag.animate([{ opacity: 0, transform: "scale(.985)" }, { opacity: 1, transform: "none" }],
        { duration: 280, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
      slap($(".nx-tape--h", done), $(".nx-sh--h", done), 260, -1.2);
      slap($(".nx-tape--d", done), $(".nx-sh--d", done), 470, 1.6);
      txt.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }],
        { duration: 260, delay: 520, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
    };
    // ждём картинки не дольше 700 мс: если сеть медленная, лучше показать как есть
    Promise.race([loadBag(), new Promise(function (r) { setTimeout(r, 700); })]).then(go);
  }

  function subscribe(ch, value) {
    var c = CH[ch] || CH.telegram, v = (value || "").trim();
    if (!v) { setErr(EMPTY); return false; }
    if (!c.ok(v)) { setErr(c.bad); return false; }
    setErr("");
    d.dispatchEvent(new CustomEvent("grinchin:subscribe", { detail: { channel: ch } }));
    showDone(ch);
    return true;
  }

  if (form && done) {
    var inp = $("[data-nx-input]", form), lab = $("[data-nx-label]", form);
    form.addEventListener("change", function (e) {
      if (e.target.name !== "nx-ch") return;
      var c = CH[channel()];
      lab.textContent = c.label; inp.placeholder = c.ph; inp.type = c.type;
      inp.inputMode = c.mode; inp.autocomplete = c.ac;
      inp.value = ""; setErr("");
      inp.focus({ preventScroll: true });
    });
    inp.addEventListener("input", function () { if (inp.hasAttribute("aria-invalid")) setErr(""); });
    inp.addEventListener("focus", loadBag, { once: true }); // намерение подписаться — подгрузить пакет заранее
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!subscribe(channel(), inp.value)) inp.focus();
    });
    near(sec, loadBag);
  }

  /* ================= подвал ================= */
  var ft = d.getElementById("footer");
  var logo = ft && $(".fo-logo", ft);
  var PAPER = { w: 1044, h: 954 }; // img/end/paper.* и crease.jpg — одна пропорция

  // фон: background-size:cover, позиция center bottom — повторяем ту же математику для заломов лого
  function alignLogo() {
    if (!ft || !logo) return;
    var fr = ft.getBoundingClientRect(), lr = logo.getBoundingClientRect();
    if (!fr.width || !lr.width) return;
    var s = Math.max(fr.width / PAPER.w, fr.height / PAPER.h);
    var w = PAPER.w * s, h = PAPER.h * s;
    var x = (fr.width - w) / 2, y = fr.height - h;
    var st = logo.style;
    st.setProperty("--cw", w.toFixed(1) + "px");
    st.setProperty("--ch", h.toFixed(1) + "px");
    st.setProperty("--cx", (x - (lr.left - fr.left)).toFixed(1) + "px");
    st.setProperty("--cy", (y - (lr.top - fr.top)).toFixed(1) + "px");
  }
  if (ft) {
    near(ft, function () { ft.classList.add("is-near"); alignLogo(); });
    if ("ResizeObserver" in window) new ResizeObserver(alignLogo).observe(ft);
    window.addEventListener("load", alignLogo);
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(alignLogo);
    alignLogo();
    ft.addEventListener("click", function (e) {
      var b = e.target.closest("[data-ft-open]");
      if (!b) return;
      e.preventDefault();
      if (GV.open) GV.open(b.dataset.ftOpen);
    });
  }

  /* ================= 404 ================= */
  var sign = $("[data-404-sign]");
  function play404() {
    if (!sign) return;
    var m = GV.motion;
    if (m && typeof m.play404 === "function") {
      sign.classList.add("is-playing");
      try { m.play404(sign); } catch (err) { sign.classList.remove("is-playing"); }
    }
  }
  d.addEventListener("grinchin:overlay", function (e) {
    var x = e.detail || {};
    if (x.name !== "404") return;
    if (x.open) play404(); else if (sign) sign.classList.remove("is-playing");
  });

  GV.end = { subscribe: subscribe, alignLogo: alignLogo, play404: play404, loadBag: loadBag };
})();
