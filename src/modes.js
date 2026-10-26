/* GRINCHIN v4 — переключатель режимов. Владелец: V1 (интерфейс как в v3, оси — SPEC_V4).
   Состояние и API (GV.mode) ставит инлайн-скрипт в <head> index.html ещё до первой отрисовки; здесь — только интерфейс:
   бирка «режим 1 2 3 4 · ⚙» в левом нижнем углу (вертикальная, живёт в поле страницы и не лезет на контент)
   и панель всех осей (<dialog>: фокус-ловушка, Esc и возврат фокуса — у браузера).
   Ось без живого переключения → перезагрузка с &skip=1; панель после неё открывается снова на той же оси.
   ?clean=1 — бирки нет (html[data-clean]). */
(function () {
  "use strict";
  var d = document, h = d.documentElement, GV = window.GV || {}, M = GV.mode;
  if (!M) return;
  var REOPEN = "grinchin:mode:panel";

  // подписи осей v4; порядок — от первого экрана вниз по странице
  var AX = [
    ["heroimg", "Hero — кто в кадре", { mascot: "сцена + маскот", scene: "только сцена", look: "лукбук-кадр" }],
    ["hero", "Hero — движение", { asphalt: "заголовок ложится на асфальт", static: "постер стоит" }],
    ["g", "3D-знак G — материал (при маскоте в hero — чёрный винил)", { lime: "гладкий лайм", tape: "скотч с заломами", black: "чёрный глянец, лаймовый торец" }],
    ["cards", "Рисунки вещей", { a: "техкарта", b: "маркер", c: "деталь", d: "техкарта + пометка от руки" }],
    ["ghost", "Фото вещи при наведении", { on: "рисунок → фото", off: "только рисунок" }],
    ["size", "Выбор размера", { vector: "кресты", hand: "маркером" }],
    ["rack", "Дроп на вешалках (3D)", { on: "крутится от прокрутки", drag: "крутить руками", chain: "на цепи", off: "нет" }],
    ["brand", "Блок о бренде", { sign: "3D-знак ONE WAY or ANOTHER", story: "история STOP → ST’ART" }],
    ["roll", "Рулон ленты по странице", { page: "катится до подвала", quiet: "сдержанно: тоньше, без креста", off: "нет" }],
    ["tape", "Цвет ленты", { lime: "лайм (чёрная, где свой зелёный)", black: "чёрная с лаймовой печатью" }],
    ["marquee", "Бегущая лента", { off: "нет", on: "есть, IGNORE THE SIGNS" }],
    ["stickers", "Стикеры", { on: "акцентами", max: "щедрее", off: "нет" }],
    ["mascot", "Маскот", { grinchin: "Гринчин везде", quiet: "только в подвале", none: "без маскота" }],
    ["mzfx", "Маскот — живость", { calm: "спокойно", max: "анимации везде" }],
    ["cart", "Корзина в шапке", { count: "счётчик после добавления", menu: "только в меню" }]
  ];
  var NAMES = M.names || { 1: "Финал", 2: "Максимум", 3: "Тихий", 4: "Улица" };
  var CIRCLE = '<svg class="mt-o" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M21 4C31 4 37 11 36 20C35 30 28 36 19 36C10 36 4 29 4 20C5 11 11 5 22 5C25 5 27 6 29 7" pathLength="1"/></svg>';
  var GEAR = '<svg class="mt-gear" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M8.6 1.5h2.8l.4 2.3 1.6.7 1.9-1.4 2 2-1.4 1.9.7 1.6 2.3.4v2.8l-2.3.4-.7 1.6 1.4 1.9-2 2-1.9-1.4-1.6.7-.4 2.3H8.6l-.4-2.3-1.6-.7-1.9 1.4-2-2 1.4-1.9-.7-1.6-2.3-.4V8.6l2.3-.4.7-1.6-1.4-1.9 2-2 1.9 1.4 1.6-.7z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><circle cx="10" cy="10" r="2.6" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- бирка: desktop — номера кнопками, телефон/планшет — одна узкая кнопка в поле (тап-зона 44 px — ниже) ---------- */
  var full = d.createElement("div");
  full.className = "mtag mtag--full";
  full.setAttribute("role", "group");
  full.setAttribute("aria-label", "Режим показа сайта");
  full.innerHTML = '<span class="mt-hole" aria-hidden="true"></span><span class="mt-k" aria-hidden="true">режим</span>' +
    [1, 2, 3, 4].map(function (n) {
      return '<button type="button" class="mt-n" data-preset="' + n + '" aria-label="Режим ' + n + " — " + NAMES[n] + '"><span>' + n + "</span>" + CIRCLE + "</button>";
    }).join("") +
    '<span class="mt-sep" aria-hidden="true"></span>' +
    '<button type="button" class="mt-cfg" aria-haspopup="dialog" aria-controls="mode-panel" aria-label="Все настройки режима">' + GEAR + "</button>";
  var mini = d.createElement("button");
  mini.type = "button";
  mini.className = "mtag mtag--mini";
  mini.setAttribute("aria-haspopup", "dialog");
  mini.setAttribute("aria-controls", "mode-panel");
  mini.innerHTML = '<span class="mt-hole" aria-hidden="true"></span><span class="mt-k" aria-hidden="true">режим</span>' +
    '<span class="mt-n is-on" aria-hidden="true"><span data-mt-cur></span>' + CIRCLE + "</span>" + GEAR;

  /* ---------- панель всех осей ---------- */
  var dlg = d.createElement("dialog");
  dlg.id = "mode-panel";
  dlg.className = "mpanel";
  dlg.setAttribute("aria-labelledby", "mp-title");
  dlg.innerHTML =
    '<div class="mp-in">' +
    '<div class="mp-head"><h2 id="mp-title" class="mp-title"><span class="mp-k" lang="en">mode:</span> <span data-mp-name></span></h2>' +
    '<button type="button" class="ov-x mp-x" data-mp-close aria-label="Закрыть настройки режима"></button></div>' +
    '<div class="mp-presets" role="group" aria-label="Готовые режимы">' +
    [1, 2, 3, 4].map(function (n) {
      return '<button type="button" class="mp-p" data-preset="' + n + '"><b>' + n + "</b>" + CIRCLE + "<span>" + NAMES[n] + "</span></button>";
    }).join("") + "</div>" +
    '<p class="mp-note">Каждую ось можно переключить отдельно. Если блок не меняется на лету, страница перезагрузится без прелоадера.</p>' +
    '<div class="mp-axes">' + AX.map(function (a) {
      return '<fieldset class="mp-ax" data-ax="' + a[0] + '"><legend><span>' + esc(a[1]) + '</span><i class="mp-mod">изменено</i></legend>' +
        '<div class="mp-opts">' + Object.keys(a[2]).map(function (v) {
          return '<label class="mp-o"><input type="radio" name="mp-' + a[0] + '" value="' + v + '"><span>' + esc(a[2][v]) + "</span></label>";
        }).join("") + "</div></fieldset>";
    }).join("") + "</div>" +
    '<div class="mp-foot"><button type="button" class="btn btn--line btn--wide" data-mp-reset></button></div>' +
    "</div>";

  function each(root, sel, fn) { Array.prototype.forEach.call(root.querySelectorAll(sel), fn); }
  function sync() {
    var m = M.get("m"), ov = M.overrides ? M.overrides() : {};
    var mod = Object.keys(ov).length > 0;
    [full, dlg].forEach(function (root) {
      each(root, "[data-preset]", function (b) {
        var on = +b.dataset.preset === m;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", String(on));
      });
    });
    var cur = mini.querySelector("[data-mt-cur]"); if (cur) cur.textContent = String(m);
    full.classList.toggle("is-mod", mod);
    mini.classList.toggle("is-mod", mod);
    mini.setAttribute("aria-label", "Режим " + m + " — " + NAMES[m] + (mod ? ", с правками" : "") + ". Настройки режима");
    dlg.querySelector("[data-mp-name]").textContent = "режим " + m + " · " + NAMES[m] + (mod ? " + правки" : "");
    AX.forEach(function (a) {
      var v = M.get(a[0]);
      each(dlg, 'input[name="mp-' + a[0] + '"]', function (r) { r.checked = r.value === v; });
      var fs = dlg.querySelector('[data-ax="' + a[0] + '"]');
      if (fs) fs.classList.toggle("is-mod", Object.prototype.hasOwnProperty.call(ov, a[0]));
    });
    var rb = dlg.querySelector("[data-mp-reset]");
    rb.textContent = "Сбросить к режиму " + m;
    rb.disabled = !mod;
  }

  function open(focusAxis) {
    sync();
    if (dlg.open) return;
    try { dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); }
    h.dataset.modePanel = "1";
    var t = focusAxis && dlg.querySelector('input[name="mp-' + focusAxis + '"]:checked');
    if (t) { t.focus({ preventScroll: true }); t.closest(".mp-ax").scrollIntoView({ block: "center" }); }
    else { var p = dlg.querySelector(".mp-p.is-on"); if (p) p.focus({ preventScroll: true }); }
  }
  function close() { if (dlg.open) dlg.close(); }
  dlg.addEventListener("close", function () { delete h.dataset.modePanel; });
  function remember(axis) { try { sessionStorage.setItem(REOPEN, axis || "*"); } catch (e) { /* без хранилища панель просто не откроется снова */ } }
  // уйдём ли на перезагрузку: хоть одна меняемая ось не объявлена живой
  function willReload(target) {
    return Object.keys(target).some(function (a) { return M.get(a) !== target[a] && !M.isLive(a); });
  }
  function goPreset(n) {
    if (willReload(M.presets[n])) remember("*");
    M.preset(n);
    sync();
  }

  dlg.addEventListener("click", function (e) {
    if (e.target === dlg) { close(); return; } // клик по подложке
    if (e.target.closest("[data-mp-close]")) { close(); return; }
    var p = e.target.closest("[data-preset]");
    if (p) { goPreset(+p.dataset.preset); return; }
    if (e.target.closest("[data-mp-reset]")) goPreset(M.get("m"));
  });
  dlg.addEventListener("change", function (e) {
    var r = e.target;
    if (!r.name || r.name.indexOf("mp-") !== 0) return;
    var axis = r.name.slice(3);
    if (!M.isLive(axis)) remember(axis); // после перезагрузки панель откроется на этой же оси
    M.set(axis, r.value);
    sync();
  });
  full.addEventListener("click", function (e) {
    var p = e.target.closest("[data-preset]");
    if (p) { M.preset(+p.dataset.preset); sync(); return; }
    if (e.target.closest(".mt-cfg")) open();
  });
  mini.addEventListener("click", function () { open(); });
  d.addEventListener("grinchin:mode", sync);

  /* ---------- тап-зона 44 px у узкой бирки (телефон/планшет) ----------
     Сама бирка 14 px — живёт в поле страницы (16 px) и не закрывает контент. Палец шире: тап в полосе 44 px от края
     на высоте бирки тоже открывает панель — НО только если под пальцем нет ничего нажимаемого (CTA, карточка, ссылка,
     поле): им тап отдаётся как обычно. Отдельного слоя поверх страницы нет, поэтому рулон и прокрутка не задеты. */
  var HIT = 44, PRESS = "a[href],button,input,select,textarea,label,summary,[role=button],[tabindex]:not([tabindex='-1']),article.card,dialog,.ov,#header,.mtag";
  function shown(el) {
    if (!el.getClientRects().length) return false;
    var cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0.1;
  }
  d.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || h.dataset.clean || h.dataset.overlay || dlg.open || !shown(mini)) return;
    var r = mini.getBoundingClientRect(), x = e.clientX, y = e.clientY;
    if (x < r.left || x > r.left + HIT || y < r.top - 6 || y > r.bottom + 6) return;
    var t = e.target;
    if (t && t.closest && t.closest(PRESS)) return; // попал в кнопку/карточку/ссылку — это их тап
    e.preventDefault(); e.stopPropagation();
    open();
  }, true);

  /* ---------- пункт «режим» в меню (второй вход в панель, полноценная цель 44+ px) ---------- */
  var mrow = d.querySelector("[data-mode-open]");
  function syncRow() {
    if (!mrow) return;
    var m = M.get("m"), mod = M.overrides && Object.keys(M.overrides()).length > 0;
    var n = mrow.querySelector("[data-mode-name]"); if (n) n.textContent = m + " · " + NAMES[m] + (mod ? " + правки" : "");
    mrow.hidden = !!h.dataset.clean;
  }
  if (mrow) {
    mrow.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      if (GV.closeAll) GV.closeAll();
      setTimeout(function () { open(); }, 0); // после того, как меню вернёт фокус бургеру — панель заберёт его себе
    });
    d.addEventListener("grinchin:mode", syncRow);
  }

  function mount() {
    d.body.appendChild(full);
    d.body.appendChild(mini);
    d.body.appendChild(dlg);
    sync(); syncRow();
    // у подвала (контакты, юридическая строка) бирку прячем: как только подвал показался снизу
    var ft = d.getElementById("footer"), end = ft;
    if (!ft) { end = d.createElement("div"); end.className = "mt-end"; end.setAttribute("aria-hidden", "true"); d.body.appendChild(end); }
    // v4: и пока низ экрана (полоса бирки, ~200 px) занят блоком с подписями у левого края — рейл S1 (#rack) и всё с [data-mtag-avoid]
    var off = { foot: false, zone: false };
    function apply() { if (off.foot || off.zone) h.dataset.mtagOff = "1"; else delete h.dataset.mtagOff; }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (x) { off.foot = x.isIntersecting; }); apply();
      }, { rootMargin: "0px 0px 40px 0px" }).observe(end);
      var zones = [].slice.call(d.querySelectorAll("#rack, [data-mtag-avoid]")), live = new Set(), raf = 0;
      var check = function () {
        raf = 0; var vh = innerHeight, hit = false;
        // широкая бирка (desktop ≥1100) живёт в поле 34 px и подписям не мешает — прячем только узкую
        if (innerWidth < 1100) live.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < vh - 16 && r.bottom > vh - 200) hit = true; });
        if (hit !== off.zone) { off.zone = hit; apply(); }
      };
      var onScroll = function () { if (!raf) raf = requestAnimationFrame(check); };
      if (zones.length) {
        var zio = new IntersectionObserver(function (es) {
          es.forEach(function (x) { if (x.isIntersecting) live.add(x.target); else live.delete(x.target); });
          if (live.size) window.addEventListener("scroll", onScroll, { passive: true }); else window.removeEventListener("scroll", onScroll);
          check();
        });
        zones.forEach(function (z) { zio.observe(z); });
      }
    }
    var again = null;
    try { again = sessionStorage.getItem(REOPEN); sessionStorage.removeItem(REOPEN); } catch (e) { /* — */ }
    if (again && !h.dataset.clean) setTimeout(function () { open(again === "*" ? null : again); }, 60);
  }
  if (d.body) mount(); else d.addEventListener("DOMContentLoaded", mount, { once: true });

  GV.modes = { open: open, close: close };
})();
