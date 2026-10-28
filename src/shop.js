/* GRINCHIN v4 — каркас и магазин. Владелец: V2 (v3 — K1).
   v4: карточка дропа — рисунок K3 + ghost-фото вещи («призрачный манекен», GV_PHOTOS): desktop — наведение, телефон — удержание
   или свайп по обложке (точки «рисунок · фото»), бейдж «3D» на фото. Карточка товара: вкладки «Кадры | 3D», галерея
   рисунок → перед → спина → бок → образ на модели, точки + счётчик, зум (двойной тап / клик), 3D — GV.rack.mountProduct (S1).
   Новые хуки: GV.productTab('photo'|'3d'), ?open=product:<id>:3d, событие grinchin:product-view {id, view}. База — shop.js v2 (перенос почти дословный, R2 §1.4–1.5).
   window.GV: open/close оверлеев (стек, фокус-ловушка, Esc, inert, блокировка скролла, свайп шитов), корзина,
   навигация (свой плавный скролл, без wipe), тост над кнопкой. Рендер сетки дропа, карточки товара, корзины, меню.
   Выбор размера — «бирка»: тап по размеру → остальные зачёркиваются каскадом, выбранный обводится (R4 §3.6);
   стиль штриха — ось html[data-size] = vector | hand (живая: переключается без перезагрузки, только CSS).
   Корзина в шапке — ось html[data-cart] = count | menu (живая). Заполненность корзины — html[data-bag] = full | empty.
   Арт карточек — K3: GV.art.render(card, p, style) и GV.art.gallery(p, style); без GV.art — эскиз <img>.
   События: шлём grinchin:cart {count,items} / :add {id,size} / :overlay {name,open} / :navigate {target};
   слушаем grinchin:ready (после него — ?open=…).
   Query: ?shot=1 — без анимаций; &open=product:<id>|cart|sizes|menu|404; &cart=demo — две вещи в корзине. */
(function () {
  "use strict";
  var d = document, root = d.documentElement;
  var GV = (window.GV = window.GV || {});
  var P = window.GV_PRODUCTS || [];
  var LOOKS = window.GV_LOOKS || [];
  var DROP = window.GV_DROP || { total: 8, shipFrom: "01.12", preorderTill: "30.11", maxQty: 3 };
  var byId = {};
  P.forEach(function (p) { byId[p.id] = p; });

  var Q = (function () { try { return new URLSearchParams(location.search); } catch (e) { return { get: function () { return null; } }; } })();
  var isShot = root.dataset.shot === "1";
  var mq = function (q) { return !!(window.matchMedia && matchMedia(q).matches); };
  var reduced = mq("(prefers-reduced-motion: reduce)");
  var instant = function () { return isShot || reduced; };
  var canHover = mq("(hover: hover) and (pointer: fine)");
  var isPhone = function () { return mq("(max-width: 767px)"); };

  // игры больше нет (SPEC_V3): у тех, кто играл в v1, чистим её ключи
  try { localStorage.removeItem("grinchin:gather:v1"); localStorage.removeItem("grinchin:gather:invited"); } catch (e) { /* без хранилища */ }
  // оси, которые этот модуль рисует сам и умеет менять на лету (только CSS)
  if (GV.mode) { GV.mode.live("size"); GV.mode.live("cart"); GV.mode.live("ghost"); }
  // ось v4 ghost = on | off: ghost-фото на обложке карточки (живая — только CSS + ленивая подгрузка)
  function ghostOn() { return root.dataset.ghost !== "off"; }
  function cardStyle() { return (GV.mode && GV.mode.get("cards")) || root.dataset.cards || "photo"; }
  /* v4.1: ось cards = photo (по умолчанию) — обложка карточки сразу фото «на манекене» (единый свет/фон/масштаб,
     v4/build/V2/_tools/normalize.py), наведение/свайп — спина; a|b|c|d — рисунки v3 (запас), наведение — фото спереди */
  function photoMode() { return cardStyle() === "photo"; }

  /* ---------- утилиты ---------- */
  var nf = new Intl.NumberFormat("ru-RU");
  function money(n) { return nf.format(n).replace(/\s/g, " ") + " ₽"; }
  /* неразрывные пробелы: после коротких слов, перед тире, в «с 01.12», «187 см», «2–7 дней» */
  function typo(t) {
    return String(t)
      .replace(/(^|[\s(«])([А-Яа-яЁёA-Za-z]{1,2})\s+/g, "$1$2 ")
      .replace(/(^|[\s(«])([А-Яа-яЁёA-Za-z]{1,2})\s+/g, "$1$2 ")
      .replace(/\s+—/g, " —")
      .replace(/(\d)\s+(?=(см|дней|дня|г\/м²|oz|₽)(?![А-Яа-яё]))/g, "$1 ");
  }
  GV.typo = typo;
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(s, el) { return (el || d).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || d).querySelectorAll(s)); }
  function emit(name, detail) { d.dispatchEvent(new CustomEvent(name, { detail: detail })); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function num(p) { return pad(p.n) + "/" + pad(DROP.total || P.length); }
  function sizesOf(p) { return Object.keys(p.sizes); }
  function inStock(p, s) { return (p.sizes[s] || 0) > 0; }
  function anyStock(p) { return p.state !== "soldout" && sizesOf(p).some(function (s) { return inStock(p, s); }); }
  function lastSize(p) { return sizesOf(p).filter(function (s) { return p.sizes[s] === 1; })[0] || null; }
  function statusOf(p) {
    if (!anyStock(p)) return { text: "РАЗОБРАЛИ", alert: true };
    var l = lastSize(p);
    if (l) return { text: l + " — ПОСЛЕДНИЙ", alert: true };
    return { text: "", alert: false }; // «предзаказ» — один раз в шапке дропа; на карточке только исключения
  }
  function shipText(p) { return anyStock(p) ? "предзаказ · отправка с " + DROP.shipFrom : "разобрали"; }
  var ARROW = GV.arrow = '<svg class="gl" viewBox="0 0 16 12" aria-hidden="true" focusable="false"><path d="M0 6h14.5M9.5 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
  // грустная улыбка пустой корзины (фолбэк, если маскота нет): дуга знака, перевёрнутая
  var SMILE_SVG = '<svg viewBox="0 0 96 28" aria-hidden="true" focusable="false"><path d="M3 25C20 8 34 4 48 4s28 4 45 21" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

  /* ---------- бирка размеров: штрихи (R4 §3.6, прототип research/motion/proto/size.html) ----------
     В каждой ячейке — оба набора штрихов (вектор и «от руки»); какой виден, решает html[data-size].
     .x — «не твой» (лайм), .o — обводка выбранного, .n — «нет в наличии» (серый, стоит сразу).
     Все пути pathLength=1: рисуются stroke-dashoffset 1 → 0, только CSS-переходами. Скрыты от скринридера. */
  var XV = ["M18 10L78 54", "M78 10L18 54"];
  var XH = [
    ["M10 46C30 20 44 14 58 22", "M20 52L74 8", "M28 56C48 34 62 22 84 18"],
    ["M12 40L82 16", "M16 54L70 6", "M30 58L86 26"],
    ["M8 30C30 40 60 10 86 34", "M18 56L76 12"],
    ["M14 50L80 12", "M10 30L60 52", "M30 10L84 46"]
  ];
  var OV_V = "M48 5C75 5 91 17 91 32S75 59 48 59 5 47 5 32 21 5 48 5";
  var OV_H = "M48 4C74 3 92 18 90 34C88 52 66 62 44 60C20 58 5 46 7 30C9 13 28 4 52 6C58 7 63 9 66 11";
  var NV = "M14 54L82 10", NH = "M8 50C28 42 50 24 88 12";
  function pth(c, dd, k) { return '<path class="' + c + '" d="' + dd + '" pathLength="1" style="--k:' + k + '"/>'; }
  function strokes(seed) {
    var h = XH[Math.abs(seed) % XH.length];
    return '<svg class="stk" viewBox="0 0 96 64" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      '<g class="stk-v">' + XV.map(function (x, k) { return pth("x", x, k); }).join("") + pth("o", OV_V, 0) + pth("n", NV, 0) + "</g>" +
      '<g class="stk-h">' + h.map(function (x, k) { return pth("x", x, k); }).join("") + pth("o", OV_H, 0) + pth("n", NH, 0) + "</g></svg>";
  }
  /* Зачеркнуть всё, кроме sel (sel=null — бирка чистая). Каскад слева направо: штрих 0,18 с, шаг 0,07 с, обводка с 0,25 с.
     Передумал — старая обводка стирается за 0,12 с, на старом размере сразу появляется штрих, новый обводится. */
  function strikeTo(box, sel) {
    var cells = $$("[data-sz]", box), prev = box.dataset.sel || "";
    var selCell = sel ? cells.filter(function (c) { return c.dataset.sz === sel; })[0] : null;
    var selOut = !!(selCell && selCell.classList.contains("is-n"));
    box.classList.toggle("is-instant", instant());
    var order = 0;
    cells.forEach(function (c) {
      var s = c.dataset.sz, out = c.classList.contains("is-n");
      if (!sel) { c.classList.remove("is-x", "is-o"); return; }
      if (s === sel) {
        c.classList.remove("is-x");
        c.style.setProperty("--d", (prev ? .12 : .25) + "s");
        c.classList.add("is-o");
        return;
      }
      c.classList.remove("is-o");
      if (out || selOut) { c.classList.remove("is-x"); return; }
      if (!c.classList.contains("is-x")) {
        c.style.setProperty("--d", (prev ? 0 : order * .07) + "s");
        c.classList.add("is-x");
      }
      order++;
    });
    box.dataset.sel = sel || "";
  }
  GV.sizeTag = { strokes: strokes, strike: strikeTo };

  /* ---------- тост: в открытой карточке встаёт над кнопкой покупки ---------- */
  var toastEl = d.getElementById("toast"), toastT;
  /* В карточке товара тост не висит над описанием (T4): он ложится ровно на кнопку покупки — это место, куда смотрит палец,
     и под ним нет текста. opts.sheetQuiet — в карточке только объявить скринридеру (кнопка сама уже говорит «В корзине ✓»). */
  GV.toast = function (msg, ms, opts) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    var quiet = !!(opts && opts.sheetQuiet && stackTop() === "product");
    toastEl.classList.toggle("is-sr", quiet);
    if (!quiet) anchorToast(); else toastEl.classList.remove("is-anchored");
    toastEl.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove("is-on"); }, ms || (quiet ? 1200 : 2400));
  };
  function anchorToast() {
    toastEl.classList.remove("is-anchored");
    if (stackTop() !== "product") return;
    var b = $("[data-ps-add]", sheetBody);
    if (!b) return;
    var r = b.getBoundingClientRect();
    if (r.top < 60 || r.bottom > window.innerHeight || r.width < 120) return; // кнопка вне экрана — обычное место внизу
    toastEl.style.setProperty("--tx", Math.round(r.left) + "px");
    toastEl.style.setProperty("--ty", Math.round(r.top) + "px");
    toastEl.style.setProperty("--tw", Math.round(r.width) + "px");
    toastEl.style.setProperty("--th", Math.round(r.height) + "px");
    toastEl.classList.add("is-anchored");
  }

  /* ---------- корзина: в памяти + localStorage (в try/catch) ---------- */
  var KEY = "grinchin.cart.v3";
  var items = [];
  var MAX_QTY = DROP.maxQty || 3;
  function valid(i) { return i && byId[i.id] && byId[i.id].sizes.hasOwnProperty(i.size) && i.qty > 0; }
  if (Q.get("cart") === "demo") {
    items = [{ id: "suit-detour", size: "L", qty: 1 }, { id: "tee-blank", size: "L", qty: 2 }];
  } else if (!isShot) {
    try { items = (JSON.parse(localStorage.getItem(KEY)) || []).filter(valid); } catch (e) { items = []; }
  }
  function save() { if (isShot) return; try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* без хранилища — живём в памяти */ } }
  function keyOf(i) { return i.id + "|" + i.size; }
  function count() { return items.reduce(function (a, i) { return a + i.qty; }, 0); }
  function total() { return items.reduce(function (a, i) { return a + byId[i.id].price * i.qty; }, 0); }
  function limitOf(id, size) { return Math.min(MAX_QTY, byId[id].sizes[size] || 0); }
  var lastCount = -1;
  function syncCart() {
    var c = count();
    $$("[data-cart-count]").forEach(function (el) { el.textContent = c; });
    var btn = $(".hd-cart");
    if (btn) {
      btn.setAttribute("aria-label", "Корзина, товаров: " + c);
      // «шлепок» счётчика при добавлении (первое появление играет CSS-анимация показа)
      if (lastCount > 0 && c > lastCount && !instant()) { btn.classList.remove("is-bump"); void btn.offsetWidth; btn.classList.add("is-bump"); }
    }
    lastCount = c;
    root.dataset.bag = c ? "full" : "empty";
    save();
    emit("grinchin:cart", {
      count: c,
      items: items.map(function (i) { var p = byId[i.id]; return { id: i.id, size: i.size, qty: i.qty, name: p.name, price: p.price }; })
    });
    if (isOpen("cart")) renderCart();
  }
  GV.cart = {
    get items() { return items.slice(); },
    get count() { return count(); },
    get total() { return total(); },
    add: function (id, size) {
      var p = byId[id];
      if (!p || !inStock(p, size)) return false;
      var it = items.filter(function (i) { return i.id === id && i.size === size; })[0];
      var lim = limitOf(id, size);
      if (it && it.qty >= lim) { GV.toast(lim < MAX_QTY ? size + " — последний, уже в корзине." : "Больше " + MAX_QTY + " в одни руки — нет."); return false; }
      if (it) it.qty += 1; else items.push({ id: id, size: size, qty: 1 });
      syncCart();
      emit("grinchin:add", { id: id, size: size });
      GV.toast("В корзине.", 0, { sheetQuiet: true });
      return true;
    },
    setQty: function (key, q) {
      var it = items.filter(function (i) { return keyOf(i) === key; })[0];
      if (!it) return;
      var lim = limitOf(it.id, it.size);
      if (q > lim) { GV.toast(lim < MAX_QTY ? it.size + " — последний." : "Больше " + MAX_QTY + " в одни руки — нет."); q = lim; }
      it.qty = Math.max(1, q);
      syncCart();
    },
    remove: function (key) { items = items.filter(function (i) { return keyOf(i) !== key; }); syncCart(); },
    clear: function () { items = []; syncCart(); }
  };

  /* ---------- сетка дропа ---------- */
  var grid = $("[data-grid]");
  /* ---------- фото вещей (v4) ---------- */
  var PH = window.GV_PHOTOS || {}, LOOKP = window.GV_LOOK_PHOTOS || {};
  // src из srcset по ширине (фолбэк <img src> для браузеров без srcset)
  function srcOf(ss, w) {
    var hit = String(ss).split(/,\s*/).filter(function (x) { return new RegExp("\\s" + w + "w$").test(x); })[0];
    return (hit || String(ss).split(/,\s*/)[0]).replace(/\s+\d+w$/, "");
  }
  function pictureHTML(set, sizes, alt, cls, lazy, w, h) {
    return '<picture' + (cls ? ' class="' + cls + '"' : "") + '><source type="image/avif" srcset="' + set.avif + '" sizes="' + sizes + '">' +
      '<img src="' + srcOf(set.webp, 800) + '" srcset="' + set.webp + '" sizes="' + sizes + '" alt="' + esc(alt) + '" width="' + (w || 800) + '" height="' + (h || 1000) + '" decoding="async"' +
      (lazy ? ' loading="lazy"' : "") + "></picture>";
  }
  // маленькое превью (С этим, корзина): фото-перёд, если есть; иначе эскиз
  function thumbHTML(p) {
    var f = PH[p.id] && PH[p.id].front;
    return f ? pictureHTML(f, "120px", "", "", true) : '<img src="' + p.img[0] + '" alt="" width="800" height="1000" loading="lazy" decoding="async">';
  }
  GV.photos = { picture: pictureHTML, of: function (id) { return PH[id] || null; }, look: function (n) { return LOOKP[n] || null; } };

  function sketchHTML(p) {
    return '<img class="card-img" src="' + p.img[0] + '" alt="' + esc(p.name) + ' — эскиз" width="800" height="1000" decoding="async">' +
      (canHover ? '<img class="card-img card-img--alt" src="' + p.img[1] + '" alt="" aria-hidden="true" width="800" height="1000" loading="lazy" decoding="async">' : "");
  }
  function quickHTML(p) {
    // быстрый выбор (только мышь): одна точка Tab на карточку, внутри — стрелки (roving tabindex)
    var sizes = sizesOf(p), first = -1;
    sizes.forEach(function (s, i) { if (first < 0 && inStock(p, s)) first = i; });
    return '<div class="card-sizes szt szt--quick" role="toolbar" aria-label="Быстро в корзину: ' + esc(p.name) + '" style="--n:' + sizes.length + '">' +
      sizes.map(function (s, i) {
        var ok = inStock(p, s);
        return '<button type="button" class="szt-c' + (ok ? "" : " is-n") + '" data-sz="' + s + '" data-quick="' + p.id + '"' +
          ' tabindex="' + (i === first ? "0" : "-1") + '" aria-label="' + s + (ok ? " — в корзину" : " — нет") + '"' + (ok ? "" : ' aria-disabled="true"') + ">" +
          '<span class="szt-l" aria-hidden="true">' + s + "</span>" + strokes(p.n * 7 + i) + "</button>";
      }).join("") + "</div>";
  }
  function cardHTML(p) {
    var st = statusOf(p), all = anyStock(p);
    return '<article class="card" data-id="' + p.id + '" data-state="' + (all ? p.state : "soldout") + '">' +
      '<div class="card-media">' + (photoMode() && PH[p.id] ? coverHTML(p) : sketchHTML(p)) + ghostShell(p) + "</div>" +
      (all && canHover ? quickHTML(p) : "") +
      '<div class="card-body">' +
      '<p class="card-num">' + num(p) + "</p>" +
      '<p class="card-status' + (st.alert ? " is-alert" : "") + '">' + st.text + "</p>" +
      '<h3 class="card-name"><button type="button" class="card-open" data-open-product="' + p.id + '">' + esc(p.name) + "</button></h3>" +
      '<p class="card-color">[' + esc(p.color) + "]</p>" +
      '<p class="card-price"><span class="cp-v">' + money(p.price) + "</span>" +
      (all ? "" : '<svg class="stk stk--price" viewBox="0 0 96 64" preserveAspectRatio="none" aria-hidden="true" focusable="false"><g class="stk-v">' + pth("n", NV, 0) + '</g><g class="stk-h">' + pth("n", NH, 0) + "</g></svg>") +
      "</p></div></article>";
  }
  /* ghost-слой: div (не picture — GV.art.render чистит прямых детей-<picture>), фото вставляется при «гидрации» —
     после загрузки страницы рядом с экраном или сразу при наведении/касании: первые обложки-рисунки не делят канал с фото */
  function coverHTML(p) {
    return '<div class="card-photo">' + pictureHTML(PH[p.id].front, CARD_SIZES, p.name + " — фото спереди", "", true) + "</div>";
  }
  function ghostShell(p) {
    if (!PH[p.id]) return "";
    return '<div class="card-ghost" aria-hidden="true">' + (p.d3 ? '<span class="card-3d" data-card-3d title="Покрутить в 3D">3D</span>' : "") + "</div>" +
      (canHover ? "" : '<span class="card-pg" aria-hidden="true"><i></i><i></i></span>');
  }
  var CARD_SIZES = "(max-width: 1099px) 46vw, 340px";
  function arm(card) { var g = card && $(".card-ghost", card); if (g) g.classList.add("is-armed"); }
  function hydrate(card) {
    var g = card && $(".card-ghost", card), p = card && byId[card.dataset.id];
    if (!g || g.dataset.h || !p || !PH[p.id] || !ghostOn()) return;
    g.dataset.h = "1";
    var view = photoMode() ? (PH[p.id].back || PH[p.id].side) : PH[p.id].front;   // фото-режим: на наведение — спина
    g.insertAdjacentHTML("afterbegin", pictureHTML(view, CARD_SIZES, "", "cg-pic", false));
    var img = $("img", g);
    var ok = function () {
      var dec = img.decode ? img.decode() : null;
      (dec ? dec.catch(function () {}) : Promise.resolve()).then(function () { g.classList.add("is-ready"); });
    };
    if (img.complete && img.naturalWidth) ok(); else { img.addEventListener("load", ok, { once: true }); img.addEventListener("error", function () { g.remove(); }, { once: true }); }
  }
  function ghostSchedule() {
    if (!grid) return;
    var cards = $$(".card", grid);
    if (isShot) { cards.forEach(hydrate); return; }
    var start = function () {
      if (!("IntersectionObserver" in window)) { cards.forEach(hydrate); return; }
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); hydrate(e.target); } });
      }, { rootMargin: "60% 0px 60% 0px" });
      cards.forEach(function (c) { io.observe(c); });
    };
    // после load страницы и простоя: фото не толкаются с первым экраном
    var idle = function () { (window.requestIdleCallback || function (f) { setTimeout(f, 200); })(start, { timeout: 1500 }); };
    if (d.readyState === "complete") idle(); else window.addEventListener("load", idle, { once: true });
  }
  // обложка карточки: рисунок K3, если модуль подключён; иначе (или при ошибке) — эскиз
  function paintArt(card) {
    var p = byId[card.dataset.id], media = $(".card-media", card), A = GV.art;
    if (!p || !media || !A || typeof A.render !== "function" || (photoMode() && PH[p.id])) return;
    // эскизы-фолбэк убираем точечно: ghost-слой и точки (v4) остаются
    var drop = function () { $$(":scope > img.card-img, :scope > .art", media).forEach(function (n) { n.remove(); }); };
    try {
      drop();
      if (A.render(card, p, cardStyle()) === false) throw new Error("art: false");
      media.dataset.art = "1";
    } catch (e) { drop(); media.insertAdjacentHTML("afterbegin", sketchHTML(p)); delete media.dataset.art; }
  }
  if (grid) {
    grid.innerHTML = P.map(cardHTML).join("");
    var artPass = function () { if (GV.art) $$(".card", grid).forEach(paintArt); };
    if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", artPass, { once: true }); else setTimeout(artPass, 0);
    ghostSchedule();
    d.addEventListener("grinchin:mode", function (e) {
      if (!e.detail) return;
      if (e.detail.axis === "ghost" && ghostOn()) $$(".card", grid).forEach(hydrate);
      // фото ↔ рисунок: сетку пересобираем (обложка и слой наведения меняются местами)
      if (e.detail.axis === "cards") { grid.innerHTML = P.map(cardHTML).join(""); artPass(); ghostSchedule(); }
    });
  }
  /* наведение: фото грузится сразу, проявляется, когда декодировано (CSS: :hover + .is-ready) */
  if (grid && canHover) grid.addEventListener("pointerover", function (e) {
    var c = e.target.closest && e.target.closest(".card");
    if (c) { hydrate(c); arm(c); }
  });
  if (grid) grid.addEventListener("focusin", function (e) { var c = e.target.closest(".card"); if (c) { hydrate(c); arm(c); } });
  /* телефон: удержание обложки — фото, пока палец лежит; свайп влево — фото, вправо — рисунок (точки внизу).
     Клик после жеста гасится, чтобы карточка не открылась. Вертикальный скролл — как обычно (touch-action: pan-y). */
  var swallowClick = 0;
  if (grid && !canHover) {
    var tg = null;
    var release = function () {
      if (!tg) return;
      clearTimeout(tg.timer);
      if (tg.held) { tg.card.classList.remove("is-hold"); swallowClick = Date.now(); }
      tg = null;
    };
    grid.addEventListener("touchstart", function (e) {
      var m = e.target.closest && e.target.closest(".card-media");
      if (!m || e.touches.length > 1) { release(); return; }
      var card = m.closest(".card"), t = e.touches[0];
      if (!$(".card-ghost", card) || !ghostOn()) return;
      hydrate(card); arm(card);
      tg = { card: card, x: t.clientX, y: t.clientY, axis: null, held: false };
      tg.timer = setTimeout(function () { if (tg && !tg.axis) { tg.held = true; tg.card.classList.add("is-hold"); } }, 280);
    }, { passive: true });
    grid.addEventListener("touchmove", function (e) {
      if (!tg) return;
      var t = e.touches[0], dx = t.clientX - tg.x, dy = t.clientY - tg.y;
      if (!tg.axis && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        tg.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? "x" : "y";
        if (!tg.held) clearTimeout(tg.timer);
        if (tg.axis === "y" && !tg.held) tg = null;      // это прокрутка страницы
      }
      if (tg) tg.dx = dx;
    }, { passive: true });
    grid.addEventListener("touchend", function () {
      if (tg && tg.axis === "x" && Math.abs(tg.dx || 0) > 32) {
        tg.card.classList.toggle("is-ghost", tg.dx < 0);
        swallowClick = Date.now();
      }
      release();
    }, { passive: true });
    grid.addEventListener("touchcancel", release, { passive: true });
    grid.addEventListener("contextmenu", function (e) { if (e.target.closest(".card-media")) e.preventDefault(); });
    /* подсказка жеста: первая карточка один раз за сессию «моргает» фото, когда встала в середину экрана */
    var peeked = false;
    try { peeked = isShot || reduced || sessionStorage.getItem("grinchin:peek") === "1"; } catch (e) { peeked = isShot || reduced; }
    var first = $(".card", grid);
    if (!peeked && first && "IntersectionObserver" in window) {
      var pio = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        pio.disconnect(); hydrate(first);
        try { sessionStorage.setItem("grinchin:peek", "1"); } catch (e) {}
        var g = $(".card-ghost", first), n = 0;
        (function wait() {
          if (!g) return;
          if (!g.classList.contains("is-ready")) { if (++n < 40) setTimeout(wait, 150); return; }
          // моргаем, только когда прокрутка стоит (слой фото растрится в этот момент, а не посреди жеста)
          var lastY = window.scrollY, still = 0;
          (function idle() {
            if (first.classList.contains("is-ghost")) return;
            if (Math.abs(window.scrollY - lastY) > 1) { lastY = window.scrollY; still = 0; } else still++;
            if (still < 4) { setTimeout(idle, 120); return; }
            var r = first.getBoundingClientRect();
            if (r.bottom < 0 || r.top > window.innerHeight) return;   // уехала — без подсказки
            arm(first);
            requestAnimationFrame(function () {
              first.classList.add("is-peek");
              setTimeout(function () { first.classList.remove("is-peek"); }, 1100);
            });
          })();
        })();
      }, { rootMargin: "-30% 0px -30% 0px" });
      pio.observe(first);
    }
  }
  var quickT = new WeakMap();
  if (grid) grid.addEventListener("click", function (e) {
    if (swallowClick && Date.now() - swallowClick < 600) { swallowClick = 0; e.stopPropagation(); e.preventDefault(); return; }
    var row = e.target.closest(".card-sizes");
    if (row) {
      e.stopPropagation(); // ряд размеров перехватывает клики сам: карточка не открывается
      var b = e.target.closest("[data-quick]");
      if (!b || b.getAttribute("aria-disabled") === "true") return;
      strikeTo(row, b.dataset.sz);
      GV.cart.add(b.dataset.quick, b.dataset.sz);
      clearTimeout(quickT.get(row));
      quickT.set(row, setTimeout(function () { strikeTo(row, null); }, 1500));
      return;
    }
    var card = e.target.closest(".card");
    if (card) {
      e.stopPropagation();
      var ob = $(".card-open", card); if (ob && d.activeElement !== ob) ob.focus({ preventScroll: true }); // сюда вернётся фокус
      GV.open("product", card.dataset.id);
      if (e.target.closest("[data-card-3d]")) GV.productTab("3d");
    }
  });
  if (grid) grid.addEventListener("keydown", function (e) {
    var b = e.target.closest && e.target.closest(".card-sizes [data-sz]");
    if (!b || ["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(e.key) < 0) return;
    e.preventDefault();
    var all = $$("[data-sz]", b.parentNode), i = all.indexOf(b);
    var j = e.key === "Home" ? 0 : e.key === "End" ? all.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + all.length) % all.length;
    all.forEach(function (x) { x.tabIndex = -1; });
    all[j].tabIndex = 0; all[j].focus();
  });
  if (grid) grid.addEventListener("mouseleave", function (e) {
    var row = e.target.classList && e.target.classList.contains("card") && $(".card-sizes", e.target);
    if (row && row.dataset.sel) { clearTimeout(quickT.get(row)); strikeTo(row, null); }
  }, true);

  /* ---------- карточка товара (шит) ---------- */
  var sheetBody = $("[data-ps-body]");
  var cur = { id: null, size: null };
  // v5 (C1): блок «Образы» отключён в index.html → кадр «образ на модели» и ссылка «Из образа» в карточке не показываются.
  // Вернут блок (#looks на странице) — вернутся сами.
  var LOOKS_ON = !!d.getElementById("looks");
  function lookOf(p) { return LOOKS_ON ? LOOKS.filter(function (l) { return (l.items || []).indexOf(p.id) > -1; })[0] : null; }
  /* галерея v4: рисунок (K3, первый кадр GV.art.gallery) → ghost перед → спина → бок → образ на модели (если вещь в образе).
     Деталь-лупа K3 в v4 не показываем: её место заняли фото. */
  var GAL_SIZES = "(max-width: 767px) 100vw, (max-width: 1119px) 52vw, 590px";
  function galleryOf(p) {
    var g = [], art = null;
    if (GV.art && typeof GV.art.gallery === "function") { try { art = (GV.art.gallery(p, cardStyle()) || [])[0]; } catch (e) { art = null; } }
    var drawn = art && art.html ? { type: "svg", html: art.html, alt: art.alt, tag: "рисунок" } : { type: "img", src: p.img[0], alt: p.name + " — эскиз", tag: "эскиз" };
    var ph = PH[p.id], photoFirst = photoMode() && ph;
    if (!photoFirst) g.push(drawn);
    if (ph) [["front", "перед"], ["back", "спина"], ["side", "бок"]].forEach(function (v) {
      if (ph[v[0]]) g.push({ type: "photo", set: ph[v[0]], alt: p.name + " — " + v[1] + ", фото на невидимом манекене", tag: v[1] });
    });
    var lk = lookOf(p);
    if (lk && LOOKP[lk.n]) g.push({ type: "photo", set: LOOKP[lk.n], alt: lk.alt || (p.name + " — на модели"), tag: "образ ’" + lk.n, look: true });
    if (photoFirst) g.push(drawn);          // фото-режим: рисунок — последним кадром (сохранён, но не главный)
    var seen = {};
    (p.photos || []).forEach(function (src, i) { if (!seen[src]) { seen[src] = 1; g.push({ type: "img", src: src, alt: p.name + " — фото " + (i + 1) }); } });
    return g;
  }
  function slideHTML(s, i) {
    var tag = s.tag ? '<span class="ps-tag" aria-hidden="true">' + esc(s.tag) + "</span>" : "";
    if (s.type === "svg") return '<figure class="ps-slide ps-slide--art" role="img" aria-label="' + esc(s.alt || "") + '">' + s.html + tag + "</figure>";
    if (s.type === "photo") return '<figure class="ps-slide ps-slide--photo' + (s.look ? " ps-slide--look" : "") + '" data-zoom>' +
      pictureHTML(s.set, GAL_SIZES, s.alt || "", "ps-pic", i > 1) + tag + "</figure>";
    return '<figure class="ps-slide"><img src="' + s.src + '" alt="' + esc(s.alt || "") + '" width="800" height="1000" decoding="async"' + (i ? ' loading="lazy"' : "") + ">" + tag + "</figure>";
  }
  function galleryHTML(p, gal) {
    var n = gal.length, has3d = !!p.d3;
    return '<div class="ps-gallery" data-view="photo">' +
      (has3d ? '<div class="ps-tabs-w"><div class="ps-tabs" role="tablist" aria-label="Как смотреть вещь">' +
        '<button type="button" role="tab" id="ps-tab-photo" aria-controls="ps-pane-photo" aria-selected="true" data-ps-tab="photo">Кадры<span class="ps-tabs-n">' + n + "</span></button>" +
        '<button type="button" role="tab" id="ps-tab-3d" aria-controls="ps-pane-3d" aria-selected="false" tabindex="-1" data-ps-tab="3d">3D<span class="ps-tabs-k">на вешалке</span></button></div></div>' : "") +
      '<div class="ps-stage" id="ps-pane-photo"' + (has3d ? ' role="tabpanel" aria-labelledby="ps-tab-photo"' : "") + ">" +
      '<div class="ps-track" tabindex="0" role="region" aria-label="Кадры вещи, листай">' + gal.map(slideHTML).join("") + "</div>" +
      (n > 1 ? '<p class="ps-count" aria-hidden="true"><span data-ps-i>1</span>/' + n + "</p>" +
        '<div class="ps-dots" aria-hidden="true">' + gal.map(function (s, i) { return '<i' + (i ? "" : ' class="is-on"') + "></i>"; }).join("") + "</div>" : "") +
      "</div>" +
      (has3d ? '<div class="ps-3d" id="ps-pane-3d" role="tabpanel" aria-labelledby="ps-tab-3d" hidden>' +
        '<div class="ps-3d-mount" data-rack-product="' + p.id + '"></div>' +
        '<div class="ps-3d-ph" data-ps-3d-ph><div class="ps-3d-art">' + ((gal.filter(function (s) { return s.type === "svg"; })[0] || {}).html || "") + "</div>" +
        '<p class="ps-3d-msg" data-ps-3d-msg>Вешаем на вешалку…</p></div></div>' : "") +   // подсказку «крути» даёт сам S1
      (n > 1 ? thumbsHTML(gal) : "") +
      "</div>";
  }
  /* v4.1: миниатюры (desktop) — вместо столбика из 5 кадров по 730 px: одна сцена + лента миниатюр */
  function thumbsHTML(gal) {
    return '<div class="ps-thumbs" role="group" aria-label="Кадры">' + gal.map(function (s, i) {
      var img;
      if (s.type === "photo") img = pictureHTML(s.set, "72px", "", "", true, 800, 1000);
      else {
        var m = /srcset="([^"]+)"/.exec(s.html || ""), src = m ? m[1].split(/,\s*/)[0].replace(/\s+\d+w$/, "") : (s.src || "");
        img = '<img src="' + src + '" alt="" width="800" height="1000" loading="lazy" decoding="async">';
      }
      return '<button type="button" class="ps-th' + (i ? "" : " is-on") + (s.type === "photo" ? "" : " ps-th--art") + (s.look ? " ps-th--look" : "") + '" data-ps-th="' + i + '" aria-label="Кадр ' + (i + 1) + (s.tag ? ": " + esc(s.tag) : "") + '"' + (i ? "" : ' aria-current="true"') + ">" + img + "</button>";
    }).join("") + "</div>";
  }
  function sizeTagHTML(p) {
    var sizes = sizesOf(p);
    return '<div class="ps-sizes-head"><span class="t-mono" id="ps-sz-l">размер:</span><button type="button" class="link" data-open="sizes">Размерная сетка</button></div>' +
      '<div class="szt szt--sheet" role="radiogroup" aria-labelledby="ps-sz-l" style="--n:' + sizes.length + '">' +
      '<span class="szt-hole" aria-hidden="true"></span>' +
      sizes.map(function (s, i) {
        var ok = inStock(p, s);
        return '<label class="szt-c' + (ok ? "" : " is-n") + '" data-sz="' + s + '">' +
          '<input class="szt-in" type="radio" name="ps-size" value="' + s + '">' +
          '<span class="szt-l">' + s + (ok ? "" : '<span class="vh"> — нет в наличии</span>') + "</span>" + strokes(p.n * 7 + i) + "</label>";
      }).join("") + "</div>";
  }
  function renderSheet(p) {
    rackOff(); unzoom();
    cur = { id: p.id, size: null };
    var all = anyStock(p);
    var pairs = (p.pairs || []).map(function (id) { return byId[id]; }).filter(Boolean);
    var look = lookOf(p), gal = galleryOf(p), cap = "";
    // подпись под галереей — от K3 (серой строкой): что нарисовано и что будет на фото
    if (GV.art && typeof GV.art.caption === "function") { try { cap = GV.art.caption(p) || ""; } catch (e) { cap = ""; } }
    sheetBody.innerHTML =
      '<div class="ps-grid" data-state="' + (all ? p.state : "soldout") + '">' +
      galleryHTML(p, gal).replace(/<\/div>$/, (cap ? '<p class="ps-cap">' + esc(typo(cap)) + "</p>" : "") + "</div>") +
      '<div class="ps-info">' +
      '<p class="ps-num">' + num(p) + "</p>" +
      '<h2 id="ps-title" class="ps-title">' + esc(p.name) + "</h2>" +
      '<p class="ps-line"><span>[' + esc(p.color) + ']</span><span class="ps-price">' + money(p.price) + "</span></p>" +
      '<p class="ps-ship">' + shipText(p) + "</p>" +
      '<p class="ps-desc">' + esc(typo(p.desc)) + "</p>" +
      sizeTagHTML(p) +
      '<dl class="kv ps-fit"><div><dt>посадка:</dt><dd>' + esc(p.fit) + "</dd></div><div><dt>модель:</dt><dd>" + esc(typo(p.model)) + "</dd></div></dl>" +
      '<div class="ps-notify" data-ps-notify hidden>' +
      '<p data-notify-head></p>' +
      '<form class="ps-notify-form" data-notify-form novalidate><label class="vh" for="ps-notify-input">Ник в Telegram или почта</label>' +
      '<input id="ps-notify-input" type="text" placeholder="@ник или почта" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="ps-notify-err">' +
      '<button type="submit" class="btn btn--dark">Сообщить</button></form>' +
      '<p class="field-err" id="ps-notify-err" data-notify-err></p></div>' +
      '<div class="ps-buy">' +
      '<button type="button" class="btn ps-add" data-ps-add></button>' +
      '<button type="button" class="link ps-gocart" data-open="cart">Корзина' + ARROW + "</button>" +
      "</div>" +
      '<div class="ps-acc">' +
      acc("Состав и уход", "<p>" + esc(typo(p.composition)) + ".</p><p>" + esc(typo(p.care)) + ".</p>") +
      acc("Доставка и предзаказ", "<p>" + typo("Предзаказ до " + DROP.preorderTill + ", отправка с " + DROP.shipFrom + ". СДЭК или Почта России, 2–7 дней.") + "</p>") +
      acc("Возврат", "<p>" + typo("14 дней, если вещь не носили и бирка на месте. Обмен размера — бесплатно.") + "</p>") +
      "</div></div>" +
      ((pairs.length || look) ?
        '<div class="ps-more"><div class="ps-more-head"><h3 class="t-h3">С этим</h3>' +
        (look ? '<button type="button" class="link" data-look-go="' + look.n + '">Из образа ’' + look.n + ARROW + "</button>" : "") + "</div>" +
        '<div class="ps-more-grid">' + pairs.map(function (q) {
          return '<button type="button" class="mini" data-open-product="' + q.id + '">' + thumbHTML(q) +
            '<span class="mini-name">' + esc(q.name) + '</span><span class="mini-price">' + money(q.price) + "</span></button>";
        }).join("") + "</div></div>" : "") +
      "</div>";
    setBuy(p);
    var panel = $(".ps-panel");
    if (panel) panel.scrollTop = 0;
    var track = $(".ps-track", sheetBody), raf = 0, lastI = 0;
    var dots = $$(".ps-dots i", sheetBody), numEl = $("[data-ps-i]", sheetBody), ths = $$("[data-ps-th]", sheetBody);
    track.addEventListener("scroll", function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        if (i === lastI) return;
        if (dots[lastI]) dots[lastI].classList.remove("is-on");
        if (dots[i]) dots[i].classList.add("is-on");
        ths.forEach(function (b, k) { b.classList.toggle("is-on", k === i); if (k === i) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); });
        lastI = i;
        if (numEl) numEl.textContent = i + 1;
        unzoom();
      });
    }, { passive: true });
  }
  function acc(t, body) { return '<details class="acc"><summary>' + t + '</summary><div class="acc-body">' + body + "</div></details>"; }
  function sheetProduct() { return byId[cur.id]; }
  function setBuy(p, mode) {
    var btn = $("[data-ps-add]", sheetBody);
    if (!btn) return;
    var s = cur.size, out = s && !inStock(p, s);
    var subd = p.subs && (anyStock(p) ? p.subs[s] : p.subs["*"]);
    mode = mode || (subd ? "subscribed" : !anyStock(p) ? "notify-all" : !s ? "pick" : out ? "notify" : "add");
    var label = {
      pick: "Выбери размер",
      add: "В корзину · " + money(p.price),
      done: "В корзине ✓",
      notify: "Сообщить, когда будет",
      "notify-all": "Сообщить о перезапуске",
      subscribed: "Подписан ✓" + (anyStock(p) && s ? " · " + s : "")
    }[mode];
    btn.textContent = label;
    btn.dataset.mode = mode === "notify-all" ? "notify" : mode;
    btn.setAttribute("aria-disabled", mode === "pick" || mode === "subscribed" ? "true" : "false");
  }
  function showNotify(on, focus) {
    var box = $("[data-ps-notify]", sheetBody), p = sheetProduct();
    if (!box || !p) return;
    box.hidden = !on;
    if (on) $("[data-notify-head]", box).textContent = anyStock(p) ? (cur.size || "Размер") + " — нет." : "Разобрали.";
    if (on && focus) { var inp = $("input", box); if (inp) inp.focus(); }
  }
  var doneT;
  function pickSize(s) {
    var p = sheetProduct(), box = $(".szt--sheet", sheetBody);
    if (!p || !box) return;
    cur.size = s;
    strikeTo(box, s);
    clearTimeout(doneT);
    var b = $(".ps-buy", sheetBody); if (b) b.classList.remove("is-added");
    setBuy(p);
    showNotify(!inStock(p, s) && anyStock(p), false);
  }
  if (sheetBody) {
    sheetBody.addEventListener("change", function (e) {
      if (e.target.classList && e.target.classList.contains("szt-in")) pickSize(e.target.value);
    });
    sheetBody.addEventListener("click", function (e) {
      var p = sheetProduct();
      if (!p) return;
      var add = e.target.closest("[data-ps-add]");
      if (add) {
        var mode = add.dataset.mode;
        if (mode === "pick") {
          var g = $(".szt--sheet", sheetBody);
          g.classList.remove("is-nudge"); void g.offsetWidth; g.classList.add("is-nudge");
          var first = $(".szt-c:not(.is-n) .szt-in", sheetBody); if (first) first.focus({ preventScroll: true });
          // ряд размеров не на экране (телефон: кнопка плавает внизу) — сначала подвести к нему, потом подсказка
          var gr = g.getBoundingClientRect();
          if (gr.top < 72 || gr.bottom > window.innerHeight - 96) {
            g.scrollIntoView({ block: "center", behavior: instant() ? "auto" : "smooth" });
            setTimeout(function () { GV.toast("Сначала размер."); }, instant() ? 0 : 380);
          } else GV.toast("Сначала размер.");
          return;
        }
        if (mode === "notify") { showNotify(true, true); return; }
        if (mode === "done" || mode === "subscribed") return;
        if (GV.cart.add(p.id, cur.size)) {
          setBuy(p, "done");
          $(".ps-buy", sheetBody).classList.add("is-added");
          clearTimeout(doneT);
          doneT = setTimeout(function () { if (sheetProduct() === p) setBuy(p); }, 1800);
        }
        return;
      }
      var lk = e.target.closest("[data-look-go]");
      if (lk) GV.navigate("looks", { look: lk.dataset.lookGo });
    });
    sheetBody.addEventListener("submit", function (e) {
      var f = e.target.closest("[data-notify-form]");
      if (!f) return;
      e.preventDefault();
      var inp = $("input", f), v = inp.value.trim(), err = $("[data-notify-err]", sheetBody);
      if (!isTg(v) && !isMail(v)) {
        err.textContent = !v ? "Нужен ник или почта." : v.indexOf("@") > 0 ? "В почте опечатка?" : "Ник — от 5 символов: латиница, цифры, _.";
        inp.setAttribute("aria-invalid", "true"); inp.focus(); return;
      }
      err.textContent = ""; inp.removeAttribute("aria-invalid");
      var box = $("[data-ps-notify]", sheetBody);
      box.innerHTML = '<p tabindex="-1">Есть. Напишем.</p>';
      var p2 = sheetProduct();
      if (p2) { (p2.subs = p2.subs || {})[anyStock(p2) ? cur.size : "*"] = 1; setBuy(p2); }
      $("p", box).focus();
    });
  }
  /* ---------- вкладки «Кадры | 3D» ----------
     3D рисует S1: GV.rack.mountProduct(el, id) → (необяз.) ручка {destroy|unmount}. Пока модуля нет — заглушка-рисунок
     и подпись; появится позже (ленивая загрузка) — смонтируем, как только объявится, пока вкладка открыта. */
  var rackH = null, rackWait = 0;
  function rackOff() {
    clearTimeout(rackWait); rackWait = 0;
    var box = sheetBody && $(".ps-3d-mount", sheetBody);
    if (rackH) {
      try { if (typeof rackH.destroy === "function") rackH.destroy(); else if (typeof rackH.unmount === "function") rackH.unmount(); } catch (e) { /* модуль S1 сам разберётся */ }
    } else if (box && box.dataset.mounted && GV.rack && typeof GV.rack.unmountProduct === "function") { try { GV.rack.unmountProduct(box); } catch (e) { /* — */ } }
    rackH = null;
    if (box) { delete box.dataset.mounted; box.innerHTML = ""; }
    var pane = sheetBody && $(".ps-3d", sheetBody);
    if (pane) pane.classList.remove("is-live", "is-stub");
  }
  function rackOn(p) {
    var pane = $(".ps-3d", sheetBody), box = pane && $(".ps-3d-mount", pane), msg = pane && $("[data-ps-3d-msg]", pane);
    if (!box || box.dataset.mounted) return;
    if (msg) msg.textContent = "Вешаем на вешалку…";
    var tries = 0;
    (function attempt() {
      rackWait = 0;
      if (!pane.isConnected || pane.hidden) return;
      var R = GV.rack;
      if (R && typeof R.mountProduct === "function") {
        try {
          rackH = R.mountProduct(box, p.id) || null;
          box.dataset.mounted = "1";
          pane.classList.add("is-live");
        } catch (e) { if (msg) msg.textContent = "3D не открылось. Листай кадры."; pane.classList.add("is-stub"); }
        return;
      }
      // модуля пока нет: ждём до ~8 с (вдруг грузится), потом честная заглушка
      if (++tries <= 16) { rackWait = setTimeout(attempt, 500); return; }
      if (msg) msg.textContent = "3D скоро. Пока листай кадры.";
      pane.classList.add("is-stub");
    })();
  }
  function setTab(view, focus) {
    var gal = sheetBody && $(".ps-gallery", sheetBody), p = sheetProduct();
    if (!gal || !p || !p.d3 || gal.dataset.view === view) return;
    gal.dataset.view = view;
    $$("[data-ps-tab]", gal).forEach(function (b) {
      var on = b.dataset.psTab === view;
      b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    $("#ps-pane-photo", gal).hidden = view !== "photo";
    $("#ps-pane-3d", gal).hidden = view !== "3d";
    unzoom();
    if (view === "3d") rackOn(p); else rackOff();
    emit("grinchin:product-view", { id: p.id, view: view });
  }
  GV.productTab = function (view) { setTab(view === "3d" ? "3d" : "photo"); };
  if (sheetBody) {
    sheetBody.addEventListener("click", function (e) {
      var tb = e.target.closest("[data-ps-tab]");
      if (tb) setTab(tb.dataset.psTab);
      var th = e.target.closest("[data-ps-th]");
      if (th) {
        var tr = $(".ps-track", sheetBody); unzoom();
        if (tr) tr.scrollTo({ left: Number(th.dataset.psTh) * tr.clientWidth, behavior: instant() ? "auto" : "smooth" });
      }
    });
    sheetBody.addEventListener("keydown", function (e) {
      var tb = e.target.closest && e.target.closest("[data-ps-tab]");
      if (tb && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); setTab(tb.dataset.psTab === "3d" ? "photo" : "3d", true); }
    });
  }
  d.addEventListener("grinchin:overlay", function (e) { if (e.detail && e.detail.name === "product" && !e.detail.open) { rackOff(); unzoom(); } });

  /* ---------- зум кадра: телефон — двойной тап (палец водит картинку), мышь — клик, кадр едет за курсором ----------
     Только transform на <picture>; пока кадр увеличен, лента не листается и шит не тянется. */
  var Z = 2.4, zEl = null, zPan = null;
  function zoomAt(slide, cx, cy) {
    var r = slide.getBoundingClientRect(), pic = $(".ps-pic", slide);
    if (!pic) return;
    zEl = slide;
    zEl.dataset.zx = ((cx - r.left) / r.width * 100).toFixed(2);
    zEl.dataset.zy = ((cy - r.top) / r.height * 100).toFixed(2);
    pic.style.transformOrigin = zEl.dataset.zx + "% " + zEl.dataset.zy + "%";
    pic.style.transform = "scale(" + Z + ")";
    slide.classList.add("is-zoom");
    var tr = slide.closest(".ps-track"); if (tr) tr.classList.add("is-zoomed");
  }
  function unzoom() {
    if (!zEl) return;
    var pic = $(".ps-pic", zEl);
    if (pic) pic.style.transform = "";
    zEl.classList.remove("is-zoom");
    var tr = zEl.closest(".ps-track"); if (tr) tr.classList.remove("is-zoomed");
    zEl = null; zPan = null;
  }
  function panTo(cx, cy) {
    if (!zEl) return;
    var r = zEl.getBoundingClientRect(), pic = $(".ps-pic", zEl);
    var x = Math.max(0, Math.min(100, (cx - r.left) / r.width * 100)), y = Math.max(0, Math.min(100, (cy - r.top) / r.height * 100));
    pic.style.transformOrigin = x.toFixed(2) + "% " + y.toFixed(2) + "%";
  }
  if (sheetBody) {
    sheetBody.addEventListener("click", function (e) {
      if (!canHover || isPhone()) return;
      var s = e.target.closest("[data-zoom]");
      if (!s) { unzoom(); return; }
      if (zEl === s) unzoom(); else { unzoom(); zoomAt(s, e.clientX, e.clientY); }
    });
    var zmRaf = 0, zmX = 0, zmY = 0;
    sheetBody.addEventListener("mousemove", function (e) {
      if (!zEl || !canHover) return;
      zmX = e.clientX; zmY = e.clientY;
      if (!zmRaf) zmRaf = requestAnimationFrame(function () { zmRaf = 0; panTo(zmX, zmY); });
    });
    sheetBody.addEventListener("mouseout", function (e) {
      if (zEl && canHover && e.target.closest && e.target.closest("[data-zoom]") === zEl && !zEl.contains(e.relatedTarget)) unzoom();
    });
    var lastTap = null;
    sheetBody.addEventListener("touchstart", function (e) {
      var s = e.target.closest && e.target.closest("[data-zoom]");
      if (!s || e.touches.length > 1) { lastTap = null; return; }
      var t = e.touches[0], now = e.timeStamp;
      if (zEl === s) zPan = { x: t.clientX, y: t.clientY };
      if (lastTap && lastTap.s === s && now - lastTap.t < 320 && Math.abs(t.clientX - lastTap.x) < 30 && Math.abs(t.clientY - lastTap.y) < 30) {
        lastTap = null;
        if (zEl === s) unzoom(); else { unzoom(); zoomAt(s, t.clientX, t.clientY); }
        return;
      }
      lastTap = { s: s, t: now, x: t.clientX, y: t.clientY };
    }, { passive: true });
    sheetBody.addEventListener("touchmove", function (e) {
      if (!zEl || !zPan || e.touches.length > 1) return;
      e.preventDefault();
      var t = e.touches[0], r = zEl.getBoundingClientRect();
      // палец тянет картинку: точка увеличения сдвигается против движения
      var zx = parseFloat(zEl.dataset.zx) - (t.clientX - zPan.x) / r.width * 100 / (Z - 1);
      var zy = parseFloat(zEl.dataset.zy) - (t.clientY - zPan.y) / r.height * 100 / (Z - 1);
      zx = Math.max(0, Math.min(100, zx)); zy = Math.max(0, Math.min(100, zy));
      zEl.dataset.zx = zx; zEl.dataset.zy = zy; zPan = { x: t.clientX, y: t.clientY };
      $(".ps-pic", zEl).style.transformOrigin = zx.toFixed(2) + "% " + zy.toFixed(2) + "%";
    }, { passive: false });
  }

  function isTg(v) { return /^@?[A-Za-z0-9_]{5,32}$/.test(v); }
  function isMail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  /* ---------- корзина ---------- */
  var cartBody = $("[data-cart-body]");
  var cartDemo = false;
  function upsell() {
    var inCart = {};
    items.forEach(function (i) { inCart[i.id] = 1; });
    var cand = [];
    items.forEach(function (i) { (byId[i.id].pairs || []).forEach(function (id) { cand.push(id); }); });
    for (var k = 0; k < cand.length; k++) { var p = byId[cand[k]]; if (p && !inCart[p.id] && anyStock(p)) return p; }
    return null;
  }
  function mountMascot(slot, opts) {
    if (!slot || slot.children.length || !GV.mascot || typeof GV.mascot.mount !== "function") return;
    try { GV.mascot.mount(slot, opts); } catch (e) { /* маскот — украшение, корзина живёт без него */ }
  }
  function renderCart() {
    if (!cartBody) return;
    if (!items.length) {
      cartBody.innerHTML = '<div class="cart-empty"><div class="cart-mascot" data-mascot-slot="cart" aria-hidden="true"></div>' +
        '<span class="smile-sad" aria-hidden="true">' + SMILE_SVG + "</span>" +
        '<p class="cart-empty-big">Пусто.</p>' +
        '<button type="button" class="btn btn--dark" data-nav="drop">Смотреть дроп ' + ARROW + "</button></div>";
      // пустая корзина: маскот V3 (поза cart-empty); на добавление V3 сам ловит grinchin:add и показывает cart-add
      mountMascot($("[data-mascot-slot]", cartBody), { pose: "cart-empty", mood: "sad" });
      return;
    }
    var pre = items.some(function (i) { return anyStock(byId[i.id]); });
    var up = upsell();
    cartBody.innerHTML =
      '<ul class="cart-list">' + items.map(function (i) {
        var p = byId[i.id], k = keyOf(i), lim = limitOf(i.id, i.size);
        return '<li class="cart-item" data-key="' + k + '">' +
          '<button type="button" class="ci-thumb" data-open-product="' + p.id + '" aria-label="Открыть: ' + esc(p.name) + '">' + thumbHTML(p) + "</button>" +
          '<div class="ci-info"><p class="ci-name">' + esc(p.name) + '</p><p class="t-mono ci-meta">размер: ' + i.size + "<br>предзаказ · с " + DROP.shipFrom + "</p></div>" +
          '<p class="ci-price">' + money(p.price * i.qty) + "</p>" +
          '<div class="ci-row"><div class="qty" role="group" aria-label="Количество: ' + esc(p.name) + '">' +
          '<button type="button" class="cell" data-qty="-1" data-key="' + k + '" aria-label="Меньше"' + (i.qty <= 1 ? " disabled" : "") + ">−</button>" +
          '<output class="cell" aria-live="polite">' + i.qty + "</output>" +
          '<button type="button" class="cell" data-qty="1" data-key="' + k + '" aria-label="Больше"' + (i.qty >= lim ? ' aria-disabled="true"' : "") + ">+</button></div>" +
          '<button type="button" class="ci-remove" data-remove="' + k + '">Убрать</button></div>' +
          '<span class="ci-strike" aria-hidden="true"></span></li>';
      }).join("") + "</ul>" +
      (up ? '<div class="cart-up"><p class="t-mono">С этим</p><button type="button" class="cu-card" data-open-product="' + up.id + '">' + thumbHTML(up) +
        '<span class="ci-name">' + esc(up.name) + '</span><span class="ci-price">' + money(up.price) + '</span><span class="cu-go" aria-hidden="true">' + ARROW + "</span></button></div>" : "") +
      '<div class="cart-foot">' +
      '<dl class="kv cart-sum"><div><dt>доставка:</dt><dd>при оформлении</dd></div>' +
      '<div class="cart-total"><dt>итого:</dt><dd>' + money(total()) + "</dd></div></dl>" +
      (pre ? '<p class="t-mono cart-pre">Отправим всё вместе с ' + DROP.shipFrom + ".</p>" : "") +
      (cartDemo ?
        '<div class="cart-demo" tabindex="-1"><p>Оплата откроется к старту продаж. Корзина сохранится.</p>' +
        '<button type="button" class="btn btn--line btn--wide" data-nav="next">Сообщить о старте</button></div>' :
        '<button type="button" class="btn btn--accent btn--wide" data-checkout>Оформить · ' + money(total()) + "</button>") +
      "</div>";
  }
  if (cartBody) cartBody.addEventListener("click", function (e) {
    var q = e.target.closest("[data-qty]");
    if (q) {
      if (q.getAttribute("aria-disabled") === "true") {
        var kk = q.dataset.key.split("|");
        GV.toast(limitOf(kk[0], kk[1]) < MAX_QTY ? kk[1] + " — последний." : "Больше " + MAX_QTY + " в одни руки — нет.");
        return;
      }
      var it = items.filter(function (i) { return keyOf(i) === q.dataset.key; })[0];
      if (it) {
        GV.cart.setQty(q.dataset.key, it.qty + Number(q.dataset.qty));
        var again = $('[data-qty="' + q.dataset.qty + '"][data-key="' + q.dataset.key + '"]', cartBody);
        if (again && !again.disabled) again.focus();
        else { var other = $('[data-qty="' + (-Number(q.dataset.qty)) + '"][data-key="' + q.dataset.key + '"]', cartBody); if (other) other.focus(); }
      }
      return;
    }
    var r = e.target.closest("[data-remove]");
    if (r) {
      var li = r.closest(".cart-item"), key = r.dataset.remove;
      var done = function () {
        GV.cart.remove(key);
        var f = $(".ci-remove, .cart-empty .btn", cartBody); if (f) f.focus();
      };
      // строку зачёркивает штрих бирки (0,15 с), потом она схлопывается (R4 §3.7)
      if (instant() || !li) done();
      else { li.classList.add("is-removing"); r.disabled = true; setTimeout(done, 340); }
      return;
    }
    if (e.target.closest("[data-checkout]")) {
      cartDemo = true; renderCart();
      var demo = $(".cart-demo", cartBody); if (demo) demo.focus();
    }
  });

  /* ---------- оверлеи ---------- */
  var OV = { product: "product-sheet", cart: "cart-drawer", sizes: "size-modal", "404": "page-404", menu: "site-menu" };
  var STACKABLE = { sizes: 1 }; // размерная сетка ложится поверх карточки и меню
  var stack = [];
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  var header = d.getElementById("header"), burger = $(".hd-burger");
  function stackTop() { return stack.length ? stack[stack.length - 1].name : null; }
  function isOpen(n) { return stack.some(function (s) { return s.name === n; }); }
  function setInert() {
    var on = stack.length > 0;
    $$("body > :not(.ov):not(script):not(template):not(#toast):not(#loader):not(dialog)").forEach(function (el) { el.inert = on; });
    // меню открыто — шапка остаётся живой: лого виден, бургер стал крестиком и закрывает меню
    if (header && stackTop() === "menu") header.inert = false;
    Object.keys(OV).forEach(function (n) {
      var el = d.getElementById(OV[n]);
      if (el) el.inert = !!(on && stackTop() !== n && !el.hidden);
    });
  }
  var lockY = 0;
  function lock(on) {
    if (on) {
      if (root.classList.contains("is-locked")) return;
      lockY = window.scrollY;
      root.style.setProperty("--sbw", (window.innerWidth - root.clientWidth) + "px");
      root.classList.add("is-locked");
    } else {
      root.classList.remove("is-locked"); root.style.removeProperty("--sbw");
      if (Math.abs(window.scrollY - lockY) > 1) window.scrollTo(0, lockY); // iOS иногда сбрасывает позицию
    }
  }
  function focusIn(el) {
    var t = $(".ov-panel", el) || $(FOCUSABLE, el);
    if (!t) return;
    if (!t.hasAttribute("tabindex")) t.setAttribute("tabindex", "-1");
    t.focus({ preventScroll: true });
  }
  function resetPanel(el) {
    $$(".ov-panel", el).forEach(function (p) { p.classList.remove("is-dragging", "is-spring", "is-closing"); p.style.transform = ""; });
    var s = $(".ov-scrim", el); if (s) { s.style.opacity = ""; s.style.transition = ""; }
  }
  function hideEl(el) {
    el.classList.remove("is-open");
    var done = function () { if (!el.classList.contains("is-open")) { el.hidden = true; resetPanel(el); } };
    if (instant()) done(); else setTimeout(done, 440);
  }
  function setBurger(open) {
    if (!burger) return;
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Меню");
  }
  function popOne(restore) {
    var s = stack.pop();
    if (!s) return;
    hideEl(s.el);
    if (s.name === "menu") setBurger(false);
    if (s.name === "cart") cartDemo = false;
    emit("grinchin:overlay", { name: s.name, open: false });
    if (stack.length) root.dataset.overlay = stackTop(); else { delete root.dataset.overlay; lock(false); cleanUrl(); }
    setInert();
    if (restore !== false) {
      var o = s.opener;
      if (o && d.contains(o) && !o.closest("[inert]") && o !== d.body && o !== root) o.focus({ preventScroll: true });
      else if (stack.length) focusIn(stack[stack.length - 1].el);
      else focusMain(); // открыто адресом (?open=, битый #hash): фокус не теряется на <body>
    }
  }
  function cleanUrl() {
    try {
      var u = new URL(location.href), ch = false;
      if (u.searchParams.has("open")) { u.searchParams.delete("open"); ch = true; }
      if (u.hash && !d.getElementById(u.hash.slice(1))) { u.hash = ""; ch = true; }
      if (ch) history.replaceState(null, "", u.pathname + u.search + u.hash);
    } catch (e) { /* file:// и песочница */ }
  }
  function focusMain() {
    var m = d.getElementById("main");
    if (!m) return;
    if (!m.hasAttribute("tabindex")) m.setAttribute("tabindex", "-1");
    m.focus({ preventScroll: true });
  }
  GV.open = function (name, arg) {
    var el = d.getElementById(OV[name]);
    if (!el) return false;
    if (name === "product") {
      if (!byId[arg]) return GV.open("404");
      renderSheet(byId[arg]);
    }
    if (name === "cart") renderCart();
    if (name === "menu") markCurrent();
    var opener = d.activeElement;
    var at = stack.map(function (s) { return s.name; }).indexOf(name);
    if (at > -1) {
      while (stack.length - 1 > at) popOne(false);
      focusIn(el);
      return true;
    }
    if (!STACKABLE[name] && stack.length) {
      // замена (меню → корзина, корзина → карточка): фокус потом вернём туда, откуда открывали первый
      opener = stack[0].opener;
      while (stack.length) popOne(false);
    }
    stack.push({ name: name, el: el, opener: opener });
    resetPanel(el);
    el.hidden = false;
    el.style.zIndex = String(80 + stack.length);
    if (instant()) el.classList.add("is-open");
    else { void el.offsetWidth; requestAnimationFrame(function () { el.classList.add("is-open"); }); }
    lock(true);
    root.dataset.overlay = name;
    setInert();
    if (name === "menu") { setBurger(true); mountMascot($("[data-mascot-slot]", el), { pose: "menu", mood: "look" }); }
    focusIn(el);
    emit("grinchin:overlay", { name: name, open: true });
    return true;
  };
  GV.close = function () { popOne(true); };
  GV.closeAll = function () { while (stack.length) popOne(stack.length === 1); };
  Object.defineProperty(GV, "overlay", { get: function () { return stackTop(); }, configurable: true });

  d.addEventListener("keydown", function (e) {
    if (!stack.length) return;
    if (e.key === "Escape") { e.preventDefault(); GV.close(); return; }
    if (e.key !== "Tab") return;
    var el = stack[stack.length - 1].el;
    var vis = function (x) { return x.getClientRects().length && !x.closest("[hidden]"); };
    var f = $$(FOCUSABLE, el).filter(vis);
    // в ловушке меню — ещё и шапка (лого, счётчик, бургер-крестик)
    if (stackTop() === "menu" && header) f = $$(FOCUSABLE, header).filter(vis).concat(f);
    if (!f.length) { e.preventDefault(); return; }
    var first = f[0], last = f[f.length - 1], a = d.activeElement;
    var inside = f.indexOf(a) > -1;
    if (!inside) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- меню: текущий раздел обведён от руки (тем же штрихом, что выбранный размер) ---------- */
  var MENU_O = "M14 34C10 18 52 6 104 7C160 8 194 18 193 31C192 46 150 55 98 55C44 55 8 47 9 33C10 22 40 14 76 11";
  var menuEl = d.getElementById("site-menu"), here = null;
  // разделы меню, которые подсвечиваются при прокрутке (v5: «Образы»/«О бренде» убраны → рейл и знак ONE WAY)
  var NAV_IDS = ["drop", "rack", "oneway", "looks", "about", "next"];
  if (menuEl) $$(".mi .mi-t", menuEl).forEach(function (a) {
    a.insertAdjacentHTML("beforeend", '<svg class="mi-o" viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="' + MENU_O + '" pathLength="1"/></svg>');
  });
  if ("IntersectionObserver" in window) {
    var vis = {};
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { vis[x.target.id] = x.isIntersecting; });
      here = NAV_IDS.filter(function (id) { return vis[id]; })[0] || null;
    }, { rootMargin: "-40% 0px -55% 0px" });
    NAV_IDS.forEach(function (id) { var s = d.getElementById(id); if (s) io.observe(s); });
  }
  function markCurrent() {
    if (!menuEl) return;
    $$(".mi[data-nav]", menuEl).forEach(function (a) {
      var on = a.dataset.nav === here;
      a.classList.toggle("is-current", on);
      if (on) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current");
    });
  }

  /* ---------- свайп вниз закрывает шит (только телефон) ---------- */
  function swipe(panel) {
    var ov = panel.closest(".ov"), scrim = $(".ov-scrim", ov);
    var y0, x0, yL, tL, v, dy, axis, track, drag, fromBar;
    panel.addEventListener("touchstart", function (e) {
      if (!isPhone() || e.touches.length > 1) { track = false; return; }
      var t = e.touches[0];
      y0 = yL = t.clientY; x0 = t.clientX; tL = e.timeStamp; v = 0; dy = 0; axis = null; drag = false;
      fromBar = !!e.target.closest(".sheet-bar");
      // увеличенный кадр и 3D-сцена забирают жесты себе
      if (!fromBar && e.target.closest(".is-zoom, .ps-3d")) { track = false; return; }
      track = fromBar || panel.scrollTop <= 0;
    }, { passive: true });
    panel.addEventListener("touchmove", function (e) {
      if (!track) return;
      var t = e.touches[0], ddy = t.clientY - y0, ddx = t.clientX - x0;
      if (!axis) {
        if (Math.abs(ddy) < 6 && Math.abs(ddx) < 6) return;
        axis = Math.abs(ddy) > Math.abs(ddx) ? "y" : "x";
        if (axis === "x" || (ddy < 0 && !fromBar)) { track = false; return; }
      }
      if (!drag) { drag = true; panel.classList.add("is-dragging"); if (scrim) scrim.style.transition = "none"; }
      e.preventDefault();
      var dt = Math.max(1, e.timeStamp - tL);
      v = .7 * v + .3 * ((t.clientY - yL) / dt);
      yL = t.clientY; tL = e.timeStamp;
      dy = ddy > 0 ? ddy : -Math.sqrt(-ddy) * 2; // вверх — резиновое сопротивление
      panel.style.transform = "translateY(" + dy + "px)";
      if (scrim) scrim.style.opacity = String(Math.max(0, 1 - Math.max(0, dy) / (panel.offsetHeight * 1.1)));
    }, { passive: false });
    function end() {
      if (!drag) { track = false; return; }
      drag = track = false;
      panel.classList.remove("is-dragging");
      if (scrim) scrim.style.transition = "";
      var h = panel.offsetHeight;
      if (dy > Math.min(h * .25, 200) || (v > .5 && dy > 32)) {
        panel.classList.add("is-closing");
        panel.style.transform = "translateY(" + (h + 24) + "px)";
        if (scrim) scrim.style.opacity = "0";
        setTimeout(function () { if (stackTop() && OV[stackTop()] === ov.id) GV.close(); }, 200);
      } else {
        panel.classList.add("is-spring");
        panel.style.transform = "";
        if (scrim) scrim.style.opacity = "";
        setTimeout(function () { panel.classList.remove("is-spring"); }, 520);
      }
    }
    panel.addEventListener("touchend", end);
    panel.addEventListener("touchcancel", end);
  }
  $$(".ov-panel[data-swipe]").forEach(swipe);

  /* ---------- навигация: свой плавный скролл (без wipe), под шапку ---------- */
  var scrollRaf = 0;
  function stopScroll() { if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = 0; } }
  ["wheel", "touchstart", "keydown"].forEach(function (ev) { window.addEventListener(ev, stopScroll, { passive: true }); });
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  GV.scrollTo = function (y) {
    stopScroll();
    var max = d.documentElement.scrollHeight - window.innerHeight;
    y = Math.max(0, Math.min(max, Math.round(y)));
    var from = window.scrollY, dist = y - from;
    if (instant() || Math.abs(dist) < 2) { window.scrollTo(0, y); return; }
    var dur = Math.min(1100, Math.max(450, Math.abs(dist) * .32)), t0 = 0;
    function step(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur);
      window.scrollTo(0, from + dist * ease(k));
      scrollRaf = k < 1 ? requestAnimationFrame(step) : 0;
    }
    scrollRaf = requestAnimationFrame(step);
  };
  // v5 (C1): старые якоря отключённых блоков ведут на соседей, а не в «Тупик.» (#looks → дроп, #about → знак ONE WAY)
  var ALIAS = { looks: "drop", about: "oneway" };
  function alias(id) { return !d.getElementById(id) && ALIAS[id] && d.getElementById(ALIAS[id]) ? ALIAS[id] : id; }
  // верх элемента без transform-ов (reveal-анимации соседей сдвигают блоки translateY во время перехода)
  function layoutTop(el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; }
  GV.navigate = function (target, opts) {
    opts = opts || {};
    target = alias(target);
    var t = d.getElementById(target);
    if (!t) return GV.open("404");
    var go = function () {
      emit("grinchin:navigate", { target: target });
      var el = (opts.look && $('[data-look="' + opts.look + '"]', t)) || t;
      var hh = header ? header.offsetHeight : 0;
      var y = target === "hero" ? 0 : layoutTop(el) - hh - (el === t ? 0 : 24);
      GV.scrollTo(y);
      try { history.replaceState(history.state, "", target === "hero" ? location.pathname + location.search : "#" + target); } catch (e) { /* file:// и песочница */ }
      if (!t.hasAttribute("tabindex")) t.setAttribute("tabindex", "-1");
      t.focus({ preventScroll: true });
    };
    if (stack.length) { GV.closeAll(); setTimeout(go, instant() ? 0 : 60); } else go();
  };

  d.addEventListener("click", function (e) {
    var t = e.target;
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var op = t.closest("[data-open-product], a[data-product]");
    if (op) { e.preventDefault(); GV.open("product", op.dataset.openProduct || op.dataset.product); return; }
    var o = t.closest("[data-open]");
    if (o) {
      e.preventDefault();
      if (o.dataset.open === "menu" && isOpen("menu")) GV.close(); // бургер-крестик закрывает
      else GV.open(o.dataset.open);
      return;
    }
    var nav = t.closest("[data-nav]");
    if (nav) { e.preventDefault(); GV.navigate(nav.dataset.nav); return; }
    var c = t.closest("[data-close]");
    if (c) {
      e.preventDefault();
      if (c.hasAttribute("data-home")) { GV.closeAll(); GV.navigate("hero"); } else GV.close();
      return;
    }
    // обычные якоря соседей (#drop, #looks…) — тем же плавным скроллом
    var a = t.closest('a[href^="#"]');
    if (a && a.getAttribute("href").length > 1) {
      var id = a.getAttribute("href").slice(1);
      if (d.getElementById(id)) { e.preventDefault(); GV.navigate(id); }
    }
  });
  var logo = d.getElementById("logo");
  if (logo) logo.addEventListener("click", function (e) { e.preventDefault(); GV.navigate("hero"); });

  /* ---------- подписка «Разобрали — вернём»: запасной обработчик, если модуль K5 (GV.end) её не взял ---------- */
  setTimeout(function () {
    var sub = $("[data-sub]");
    if (!sub || GV.end || sub.dataset.owner) return;
    var inp = $("[data-sub-input]", sub), lab = $("[data-sub-label]", sub), err = $("[data-sub-err]", sub);
    if (!inp) return;
    var CH = {
      tg: { label: "ник в Telegram:", ph: "@твой_ник", type: "text", mode: "text", ok: isTg, bad: "Ник — от 5 символов: латиница, цифры, _.", done: "Напишем в Telegram." },
      email: { label: "почта:", ph: "имя@почта.ру", type: "email", mode: "email", ok: isMail, bad: "В почте опечатка?", done: "Напишем на почту." }
    };
    var ch = function () { var r = $('input[name="ch"]:checked', sub); return r ? r.value : "tg"; };
    sub.addEventListener("change", function (e) {
      if (e.target.name !== "ch") return;
      var c = CH[ch()];
      if (lab) lab.textContent = c.label; inp.placeholder = c.ph; inp.type = c.type; inp.inputMode = c.mode;
      if (err) err.textContent = ""; inp.removeAttribute("aria-invalid"); inp.value = "";
    });
    sub.addEventListener("submit", function (e) {
      e.preventDefault();
      var c = CH[ch()], v = inp.value.trim();
      if (!c.ok(v)) { if (err) err.textContent = v ? c.bad : "Нужен ник или почта."; inp.setAttribute("aria-invalid", "true"); inp.focus(); return; }
      if (err) err.textContent = ""; inp.removeAttribute("aria-invalid");
      sub.classList.add("is-done");
      var done = $("[data-sub-done]", sub), dt = $("[data-sub-done-text]", sub);
      if (dt) dt.textContent = c.done;
      if (done) { done.hidden = false; done.focus(); }
      emit("grinchin:subscribe", { channel: ch() });
    });
  }, 0);

  /* ---------- ?open=… после grinchin:ready (сразу при shot=1) ---------- */
  var applied = false;
  function applyOpen() {
    if (applied) return;
    applied = true;
    var o = Q.get("open");
    if (o) {
      var parts = o.split(":");
      if (parts[0] === "product") { GV.open("product", parts[1]); if (parts[2] === "3d") GV.productTab("3d"); }
      else if (OV[parts[0]]) GV.open(parts[0]);
      else GV.open("404");
      return;
    }
    var h = (location.hash || "").slice(1);
    if (h && !d.getElementById(h)) { if (alias(h) !== h) GV.navigate(h); else GV.open("404"); }
  }
  // ручная правка адреса на несуществующий #раздел — тоже «Тупик.»
  window.addEventListener("hashchange", function () {
    var h = (location.hash || "").slice(1);
    if (h && !d.getElementById(h) && !stack.length) { if (alias(h) !== h) GV.navigate(h); else GV.open("404"); }
  });
  // shot: после разбора всей страницы — иначе соседние модули (GV.art, GV.rack) ещё не объявлены
  if (isShot) { if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", function () { setTimeout(applyOpen, 0); }, { once: true }); else setTimeout(applyOpen, 0); }
  else {
    d.addEventListener("grinchin:ready", applyOpen, { once: true });
    setTimeout(applyOpen, 4000); // если моушн-модуль не прислал ready
  }

  syncCart();
  GV.products = P;
  GV.byId = byId;
  GV.money = money;
})();
