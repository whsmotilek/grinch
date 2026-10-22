/* GRINCHIN v3 — каркас и магазин. Владелец: K1. База — shop.js v2 (перенос почти дословный, R2 §1.4–1.5).
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
  if (GV.mode) { GV.mode.live("size"); GV.mode.live("cart"); }
  function cardStyle() { return (GV.mode && GV.mode.get("cards")) || root.dataset.cards || "a"; }

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
  GV.toast = function (msg, ms) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    anchorToast();
    toastEl.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove("is-on"); }, ms || 2400);
  };
  function anchorToast() {
    toastEl.classList.remove("is-anchored");
    if (stackTop() !== "product") return;
    var b = $("[data-ps-add]", sheetBody);
    if (!b) return;
    var r = b.getBoundingClientRect();
    if (r.top < 120 || r.bottom > window.innerHeight) return; // кнопка вне экрана — обычное место внизу
    var th = toastEl.offsetHeight || 44;
    toastEl.style.setProperty("--tx", Math.round(r.left + r.width / 2) + "px");
    toastEl.style.setProperty("--ty", Math.round(r.top - th - 12) + "px");
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
      GV.toast("В корзине.");
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
      '<div class="card-media">' + sketchHTML(p) + "</div>" +
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
  // обложка карточки: рисунок K3, если модуль подключён; иначе (или при ошибке) — эскиз
  function paintArt(card) {
    var p = byId[card.dataset.id], media = $(".card-media", card), A = GV.art;
    if (!p || !media || !A || typeof A.render !== "function") return;
    try {
      media.innerHTML = "";
      if (A.render(card, p, cardStyle()) === false) throw new Error("art: false");
      media.dataset.art = "1";
    } catch (e) { media.innerHTML = sketchHTML(p); delete media.dataset.art; }
  }
  if (grid) {
    grid.innerHTML = P.map(cardHTML).join("");
    var artPass = function () { if (GV.art) $$(".card", grid).forEach(paintArt); };
    if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", artPass, { once: true }); else setTimeout(artPass, 0);
  }
  var quickT = new WeakMap();
  if (grid) grid.addEventListener("click", function (e) {
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
  function lookOf(p) { return LOOKS.filter(function (l) { return (l.items || []).indexOf(p.id) > -1; })[0]; }
  // галерея: первые кадры — нарисованные (K3), дальше фото (когда появятся — p.photos)
  function galleryOf(p) {
    var g = null;
    if (GV.art && typeof GV.art.gallery === "function") { try { g = GV.art.gallery(p, cardStyle()); } catch (e) { g = null; } }
    if (!g || !g.length) g = p.img.map(function (src, i) { return { type: "img", src: src, alt: p.name + (i ? " — деталь, эскиз" : " — эскиз") }; });
    var seen = {};
    g.forEach(function (x) { if (x.src) seen[x.src] = 1; });
    (p.photos || []).forEach(function (src, i) { if (!seen[src]) { seen[src] = 1; g.push({ type: "img", src: src, alt: p.name + " — фото " + (i + 1) }); } });
    return g;
  }
  function slideHTML(s, i) {
    if (s.type === "svg") return '<figure class="ps-slide ps-slide--art" role="img" aria-label="' + esc(s.alt || "") + '">' + s.html + "</figure>";
    return '<figure class="ps-slide"><img src="' + s.src + '" alt="' + esc(s.alt || "") + '" width="800" height="1000" decoding="async"' + (i ? ' loading="lazy"' : "") + "></figure>";
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
    cur = { id: p.id, size: null };
    var all = anyStock(p);
    var pairs = (p.pairs || []).map(function (id) { return byId[id]; }).filter(Boolean);
    var look = lookOf(p), gal = galleryOf(p), cap = "";
    // подпись под галереей — от K3 (серой строкой): что нарисовано и что будет на фото
    if (GV.art && typeof GV.art.caption === "function") { try { cap = GV.art.caption(p) || ""; } catch (e) { cap = ""; } }
    sheetBody.innerHTML =
      '<div class="ps-grid" data-state="' + (all ? p.state : "soldout") + '">' +
      '<div class="ps-gallery"><div class="ps-stage">' +
      '<div class="ps-track" tabindex="0" role="region" aria-label="Кадры вещи, листай">' + gal.map(slideHTML).join("") + "</div>" +
      (gal.length > 1 ? '<p class="ps-count" aria-hidden="true"><span data-ps-i>1</span>/' + gal.length + "</p>" : "") + "</div>" +
      (cap ? '<p class="ps-cap">' + esc(typo(cap)) + "</p>" : "") +
      "</div>" +
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
          return '<button type="button" class="mini" data-open-product="' + q.id + '"><img src="' + q.img[0] + '" alt="" width="800" height="1000" loading="lazy" decoding="async">' +
            '<span class="mini-name">' + esc(q.name) + '</span><span class="mini-price">' + money(q.price) + "</span></button>";
        }).join("") + "</div></div>" : "") +
      "</div>";
    setBuy(p);
    var panel = $(".ps-panel");
    if (panel) panel.scrollTop = 0;
    var track = $(".ps-track", sheetBody);
    track.addEventListener("scroll", function () {
      var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      var el = $("[data-ps-i]", sheetBody);
      if (el) el.textContent = i + 1;
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
      mountMascot($("[data-mascot-slot]", cartBody), { pose: "cart", mood: "sad" });
      return;
    }
    var pre = items.some(function (i) { return anyStock(byId[i.id]); });
    var up = upsell();
    cartBody.innerHTML =
      '<ul class="cart-list">' + items.map(function (i) {
        var p = byId[i.id], k = keyOf(i), lim = limitOf(i.id, i.size);
        return '<li class="cart-item" data-key="' + k + '">' +
          '<button type="button" class="ci-thumb" data-open-product="' + p.id + '" aria-label="Открыть: ' + esc(p.name) + '"><img src="' + p.img[0] + '" alt="" width="800" height="1000"></button>' +
          '<div class="ci-info"><p class="ci-name">' + esc(p.name) + '</p><p class="t-mono ci-meta"><span lang="en">size:</span> ' + i.size + "<br>предзаказ · с " + DROP.shipFrom + "</p></div>" +
          '<p class="ci-price">' + money(p.price * i.qty) + "</p>" +
          '<div class="ci-row"><div class="qty" role="group" aria-label="Количество: ' + esc(p.name) + '">' +
          '<button type="button" class="cell" data-qty="-1" data-key="' + k + '" aria-label="Меньше"' + (i.qty <= 1 ? " disabled" : "") + ">−</button>" +
          '<output class="cell" aria-live="polite">' + i.qty + "</output>" +
          '<button type="button" class="cell" data-qty="1" data-key="' + k + '" aria-label="Больше"' + (i.qty >= lim ? ' aria-disabled="true"' : "") + ">+</button></div>" +
          '<button type="button" class="ci-remove" data-remove="' + k + '">Убрать</button></div>' +
          '<span class="ci-strike" aria-hidden="true"></span></li>';
      }).join("") + "</ul>" +
      (up ? '<div class="cart-up"><p class="t-mono">С этим</p><button type="button" class="cu-card" data-open-product="' + up.id + '"><img src="' + up.img[0] + '" alt="" width="800" height="1000">' +
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
  if (menuEl) $$(".mi .mi-t", menuEl).forEach(function (a) {
    a.insertAdjacentHTML("beforeend", '<svg class="mi-o" viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="' + MENU_O + '" pathLength="1"/></svg>');
  });
  if ("IntersectionObserver" in window) {
    var vis = {};
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { vis[x.target.id] = x.isIntersecting; });
      here = ["drop", "looks", "about", "next"].filter(function (id) { return vis[id]; })[0] || null;
    }, { rootMargin: "-40% 0px -55% 0px" });
    ["drop", "looks", "about", "next"].forEach(function (id) { var s = d.getElementById(id); if (s) io.observe(s); });
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
  // верх элемента без transform-ов (reveal-анимации соседей сдвигают блоки translateY во время перехода)
  function layoutTop(el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; }
  GV.navigate = function (target, opts) {
    opts = opts || {};
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
      if (parts[0] === "product") GV.open("product", parts[1]);
      else if (OV[parts[0]]) GV.open(parts[0]);
      else GV.open("404");
      return;
    }
    var h = (location.hash || "").slice(1);
    if (h && !d.getElementById(h)) GV.open("404");
  }
  // ручная правка адреса на несуществующий #раздел — тоже «Тупик.»
  window.addEventListener("hashchange", function () {
    var h = (location.hash || "").slice(1);
    if (h && !d.getElementById(h) && !stack.length) GV.open("404");
  });
  if (isShot) setTimeout(applyOpen, 0);
  else {
    d.addEventListener("grinchin:ready", applyOpen, { once: true });
    setTimeout(applyOpen, 4000); // если моушн-модуль не прислал ready
  }

  syncCart();
  GV.products = P;
  GV.byId = byId;
  GV.money = money;
})();
