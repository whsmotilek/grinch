/* GRINCHIN v3 · финал страницы (K5) → window.GV.end
   1) «Разобрали — вернём»: Telegram / почта, проверка, успех — zip-пакет и две ленты «прилепляются» крест-накрест,
      маскот выглядывает из-за пакета. Сетевых запросов нет. Шлёт grinchin:subscribe {channel: 'telegram'|'email'}.
   2) Подвал: ленивая бумага; заломы лого совмещены с фоном (лого «напечатано» на том же листе).
   3) 404 — разметка и маскот (mascot.js сам выглядывает на grinchin:overlay {name:'404'}). */
(function () {
  "use strict";
  var d = document, root = d.documentElement;
  var GV = (window.GV = window.GV || {});
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  function instant() { return mq.matches || root.dataset.shot === "1"; }
  function $(s, c) { return (c || d).querySelector(s); }

  function near(el, fn, margin) {
    if (!el) return;
    if (root.dataset.shot === "1" || !("IntersectionObserver" in window)) { fn(); return; }
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); fn(); }
    }, { rootMargin: (margin || 1500) + "px 0px" });
    io.observe(el);
  }

  /* ================= сцена успеха: zip-пакет + ленты (вектор) =================
     Пакет — вектор по упаковке Grinchin2 (стр. 10/12): прозрачный zip, печать GRiNCHiN + IGNORE THE SIGNS, внутри футболка
     и вкладыш ONE WAY. Ленты крест-накрест — растр K3 (скан настоящего скотча): .tape-strip--lime / --black в next.html. */
  var LOGO = function () { return GV.mascot && GV.mascot.LOGO; };
  function bagSVG() {
    var lg = LOGO();
    var print = lg ? '<g class="nx-print" transform="translate(468,156) scale(.16)"><path d="' + lg.smile + '"/><path d="' + lg.letters + '"/></g>' : "";
    return '<svg class="nx-svg" viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
      '<defs><radialGradient id="nxv" cx="50%" cy="46%" r="70%"><stop offset="0" class="nx-vs0"/><stop offset="1" class="nx-vs1"/></radialGradient>' +
      '<linearGradient id="nxg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="nx-gs" stop-opacity=".2"/><stop offset=".42" class="nx-gs" stop-opacity=".02"/><stop offset=".52" class="nx-gs" stop-opacity=".14"/><stop offset="1" class="nx-gs" stop-opacity=".03"/></linearGradient></defs>' +
      '<rect width="1200" height="720" fill="url(#nxv)"/>' +
      '<g class="nx-bagg"><g transform="rotate(-3 600 380)">' +
        '<rect x="232" y="96" width="736" height="584" rx="16" class="nx-bag-sh"/>' +
        // внутри — сложенная белая футболка и вкладыш ONE WAY (упаковка, стр. 12)
        '<path class="nx-tee" d="M306,188 L520,188 C532,226 562,246 600,246 C638,246 668,226 680,188 L894,188 C906,188 914,196 914,208 L914,628 C914,640 906,648 894,648 L306,648 C294,648 286,640 286,628 L286,208 C286,196 294,188 306,188 Z"/>' +
        '<path class="nx-teel" d="M520,188 C532,226 562,246 600,246 C638,246 668,226 680,188 M374,204 L374,640 M826,204 L826,640 M300,566 C420,560 780,560 900,566"/>' +
        '<g transform="rotate(-5 600 560)"><rect x="508" y="512" width="184" height="92" rx="6" class="nx-ow"/><rect x="516" y="520" width="168" height="76" rx="3" class="nx-ow2"/>' +
          '<path class="nx-owa" d="M528,558 L640,558 L640,544 L672,560 L640,576 L640,562 L528,562 Z"/><text x="584" y="589" text-anchor="middle" class="nx-owt">ONE WAY</text></g>' +
        // пакет: плёнка, кромка, zip, печать
        '<rect x="214" y="78" width="772" height="620" rx="18" class="nx-film"/>' +
        '<rect x="214" y="78" width="772" height="620" rx="18" fill="url(#nxg)"/>' +
        '<path class="nx-zip" d="M222,128 L978,128 M222,141 L978,141"/>' +
        '<path class="nx-shine" d="M262,170 L322,170 L250,520 L226,520 Z M948,400 L962,400 L930,660 L912,660 Z"/>' +
        print +
        '<text x="600" y="256" text-anchor="middle" class="nx-ign">IGNORE THE SIGNS</text>' +
      "</g></g>" +
      "</svg>";
  }

  /* ================= подписка ================= */
  var CH = {
    telegram: { label: "ник:", ph: "@ник", type: "text", mode: "text", ac: "username", done: "Напишем в Telegram.",
      ok: function (v) { return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(v.replace(/^(https?:\/\/)?(t\.me\/|telegram\.me\/)/i, "").replace(/^@/, "")); },
      bad: "Ник — от 5 символов: латиница, цифры, _." },
    email: { label: "почта:", ph: "имя@почта.ру", type: "email", mode: "email", ac: "email", done: "Напишем на почту.",
      ok: function (v) { return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/.test(v); },
      bad: "В почте опечатка?" }
  };
  var EMPTY = "Нужен ник или почта.";
  var sec = d.getElementById("next");
  var form = sec && $("[data-nx-form]", sec);
  var done = sec && $("[data-nx-done]", sec);
  var built = false;
  function build() {
    if (built || !done) return; built = true;
    var sc = $("[data-nx-scene]", done); if (sc) sc.innerHTML = bagSVG();
  }
  function channel() { var r = form && $('input[name="nx-ch"]:checked', form); return r ? r.value : "telegram"; }
  function setErr(msg) {
    var inp = $("[data-nx-input]", form), err = $("[data-nx-err]", form);
    err.textContent = msg || "";
    if (msg) inp.setAttribute("aria-invalid", "true"); else inp.removeAttribute("aria-invalid");
    if (msg) {
      var tag = $(".nx-tag", form);
      if (tag && tag.animate && !instant()) tag.animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(5px)" }, { transform: "translateX(-3px)" }, { transform: "none" }], { duration: 280, easing: "ease-out" });
    }
  }

  // лента «прилепляется»: приподнята и чуть повёрнута → прижата; тень рождается с лентой и уходит под неё
  // лента «прилепляется»: приподнята, чуть больше и довёрнута → прижата. Анимируем отдельные свойства translate/scale/rotate,
  // а место и угол ленты держит её transform (они складываются, позиция не теряется)
  function slap(el, delay, rot) {
    if (!el || !el.animate) return;
    var ease = "cubic-bezier(.25,1.15,.4,1)";
    el.animate([
      { opacity: 0, translate: "0 -22px", scale: "1.06", rotate: rot + "deg" },
      { opacity: 1, offset: .45, translate: "0 1px", scale: ".995", rotate: "0deg" },
      { opacity: 1, translate: "0 0", scale: "1", rotate: "0deg" }
    ], { duration: 380, delay: delay, easing: ease, fill: "backwards" });
  }
  function popMascot() {
    var slot = $("[data-mascot-slot]", done); if (!slot) return;
    var m = slot.__mz;
    if (!m && GV.mascot && GV.mascot.mount) m = GV.mascot.mount(slot);
    if (!m) return;
    m.vis = true;
    if (!instant() && slot.animate) slot.animate([{ transform: "translateY(105%)" }, { transform: "translateY(-4%)", offset: .7 }, { transform: "none" }],
      { duration: 520, delay: 820, easing: "cubic-bezier(.2,1,.3,1)", fill: "backwards" });
    setTimeout(function () { m.react("subscribe"); setTimeout(function () { m.react("wink"); }, 1900); }, instant() ? 0 : 1100);
  }

  function showDone(ch) {
    var c = CH[ch];
    build();
    $("[data-nx-done-text]", done).textContent = c.done;
    form.hidden = true;
    done.hidden = false;
    var t = $("[data-nx-done-title]", done);
    t.focus({ preventScroll: true });
    popMascot();
    if (instant() || !done.animate) return;
    var bag = $(".nx-bagg", done), txt = $(".nx-done-txt", done);
    if (bag) bag.animate([{ opacity: 0, transform: "scale(.97)" }, { opacity: 1, transform: "none" }],
      { duration: 300, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
    if (bag) { bag.style.transformBox = "fill-box"; bag.style.transformOrigin = "50% 50%"; }
    slap($(".nx-x--l", done), 260, -2.4);
    slap($(".nx-x--k", done), 480, 2.2);
    txt.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }],
      { duration: 260, delay: 560, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
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
    inp.addEventListener("focus", build, { once: true }); // намерение подписаться — собрать сцену заранее
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!subscribe(channel(), inp.value)) inp.focus();
    });
    near(sec, build, 600);
  }

  /* ================= подвал ================= */
  var ft = d.getElementById("footer");
  var logo = ft && $(".fo-logo", ft);
  var PAPER = { w: 1044, h: 954 }; // img/end/paper.* и crease.* — одна пропорция
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
  }

  GV.end = { subscribe: subscribe, alignLogo: alignLogo, bag: bagSVG, build: build };
})();
