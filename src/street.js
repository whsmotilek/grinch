/* GRINCHIN v2 — лента «прилепить», подписи образов, счётчик свайпа. Владелец: K3. Глобально — только GV.street.
   Лента лепится ОДИН раз: при входе в зону видимости и не раньше конца прелоадера (grinchin:ready).
   Растр ленты подключается (.is-near), только когда кусок рядом с экраном, — не качается под прелоадером.
   ?shot=1 и prefers-reduced-motion — сразу на месте, без движения. #door-smile анимирует K4 (здесь не трогаем). */
(function () {
  "use strict";
  var root = document.documentElement;
  var GV = window.GV = window.GV || {};
  var still = root.dataset.shot === "1" ||
    (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var ready = still;

  /* Прилепить кусок: короткая посадка с прогибом (~350 мс, CSS @keyframes tape-land). Возвращает Promise. */
  function stick(el, opts) {
    opts = opts || {};
    el && el.classList.add("is-near");
    return new Promise(function (done) {
      if (!el || el.classList.contains("is-stuck")) return done();
      if (still || opts.instant) { el.classList.add("is-stuck"); return done(); }
      var go = function () {
        var fin = function () { el.classList.remove("is-landing"); el.removeEventListener("animationend", onEnd); done(); };
        var onEnd = function (e) { if (e.target === el) fin(); };
        el.addEventListener("animationend", onEnd);
        el.classList.add("is-stuck", "is-landing");
        setTimeout(fin, 700);                      // страховка, если animationend не придёт (вкладка в фоне)
      };
      opts.delay ? setTimeout(go, opts.delay) : go();
    });
  }

  /* [data-stick]: растр — заранее (за экран до показа), посадка — при первом показе, несколько кусков с шагом 120 мс */
  var queue = [];
  function flush() {
    if (!ready) return;
    queue.splice(0).forEach(function (el, i) { stick(el, { delay: i * 120 + 60 }); });
  }
  function watch() {
    var els = [].slice.call(document.querySelectorAll(".tape"));
    if (!("IntersectionObserver" in window)) { els.forEach(function (el) { stick(el, { instant: true }); }); return; }
    var near = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-near"); near.unobserve(en.target); } });
    }, { rootMargin: "100% 0px 100% 0px" });
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        seen.unobserve(en.target);
        if (still) stick(en.target, { instant: true }); else queue.push(en.target);
      });
      flush();
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0 });
    els.forEach(function (el) {
      // под прелоадером растр не нужен: hero-ленту подключаем к ready, остальные — по приближению
      if (el.closest("#hero") && !ready) document.addEventListener("grinchin:ready", function () { el.classList.add("is-near"); }, { once: true });
      else near.observe(el);
      if (el.hasAttribute("data-stick")) seen.observe(el); else el.classList.add("is-stuck");
    });
    if (still) els.forEach(function (el) { el.classList.add("is-near"); });
  }
  document.addEventListener("grinchin:ready", function () { ready = true; flush(); });
  setTimeout(function () {                         // прелоадер не прислал ready — ленту не держим
    if (ready) return;
    ready = true;
    [].forEach.call(document.querySelectorAll("#hero .tape"), function (el) { el.classList.add("is-near"); });
    flush();
  }, 6000);

  /* Подписи образов: имя вещи берём из GV_PRODUCTS (единый источник с карточками), статичный текст — запасной */
  function syncNames() {
    var list = window.GV_PRODUCTS || [];
    [].forEach.call(document.querySelectorAll("#looks a[data-product], #hero a[data-product]"), function (a) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].id !== a.dataset.product || !list[i].name) continue;
        var arrow = a.querySelector("[aria-hidden]");
        a.textContent = list[i].name;
        if (arrow) { a.appendChild(document.createTextNode(" ")); a.appendChild(arrow); }
        break;
      }
    });
  }

  /* Mobile: счётчик «1/3» по ближайшему к левому краю отпечатку */
  function counter() {
    var rail = document.querySelector("[data-looks-rail]"), out = document.querySelector("[data-looks-now]");
    if (!rail || !out) return;
    var looks = rail.querySelectorAll(".look"), raf = 0;
    var upd = function () {
      raf = 0;
      var x = rail.getBoundingClientRect().left + parseFloat(getComputedStyle(rail).scrollPaddingLeft || 0), best = 0, d = 1e9;
      for (var i = 0; i < looks.length; i++) {
        var dd = Math.abs(looks[i].getBoundingClientRect().left - x);
        if (dd < d) { d = dd; best = i; }
      }
      if (out.textContent !== String(best + 1)) out.textContent = best + 1;
    };
    rail.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
  }

  function init() { watch(); syncNames(); counter(); }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();

  GV.street = { stick: stick };
})();
