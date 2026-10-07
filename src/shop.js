/* GRINCHIN — каркас и путь клиента. Владелец: A.
   window.GV: open/close оверлеев, корзина, навигация, тосты. Рендер карточек, образов, шита, корзины.
   События (контракт): шлём grinchin:cart / :add / :overlay / :navigate; слушаем :ready / :mark / :gather-complete. */
(function () {
  "use strict";
  var d = document, root = d.documentElement;
  var GV = (window.GV = window.GV || {});
  var P = window.GV_PRODUCTS || [];
  var LOOKS = window.GV_LOOKS || [];
  var CATS = window.GV_CATEGORIES || [];
  var DROP = window.GV_DROP || { shipFrom: "01.12", preorderTill: "30.11" };
  var byId = {};
  P.forEach(function (p) { byId[p.id] = p; });

  var Q = (function () { try { return new URLSearchParams(location.search); } catch (e) { return { get: function () { return null; } }; } })();
  var isShot = root.dataset.shot === "1";
  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var instant = function () { return isShot || reduced; };

  /* ---------- утилиты ---------- */
  var nf = new Intl.NumberFormat("ru-RU");
  function money(n) { return nf.format(n).replace(/\s/g, " ") + " ₽"; }
  function tagPrice(n) { return nf.format(n).replace(/\s/g, "."); } // как на бирке pres_12: 7.500
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(s, el) { return (el || d).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || d).querySelectorAll(s)); }
  function emit(name, detail, cancelable) {
    return d.dispatchEvent(new CustomEvent(name, { detail: detail, cancelable: !!cancelable }));
  }
  function sizesOf(p) { return Object.keys(p.sizes); }
  function inStock(p, s) { return (p.sizes[s] || 0) > 0; }
  function anyStock(p) { return sizesOf(p).some(function (s) { return inStock(p, s); }); }
  function stateText(p) {
    if (p.state === "soldout") return "разобрали — ждём перезапуск";
    if (p.state === "preorder") return "предзаказ · отправка с " + DROP.shipFrom;
    return "отправка с " + DROP.shipFrom;
  }
  var BADGE = { "new": "NEW", drop: "DROP 01", preorder: "ПРЕДЗАКАЗ", soldout: "SOLD OUT" };
  function badges(p) {
    var kinds = [p.state === "soldout" ? "soldout" : p.state];
    if (p.id === "suit-detour") kinds.unshift("drop");
    return kinds.map(function (k) { return '<span class="tape-badge" data-kind="' + k + '">' + BADGE[k] + "</span>"; }).join("");
  }

  /* ---------- тост ---------- */
  var toastEl = d.getElementById("toast"), toastT;
  var toastAct = null;
  GV.toast = function (msg, ms, target) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastAct = target || null;
    toastEl.classList.toggle("is-action", !!target);
    toastEl.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove("is-on", "is-action"); toastAct = null; }, ms || 2600);
  };
  if (toastEl) toastEl.addEventListener("click", function () {
    if (!toastAct) return;
    toastEl.classList.remove("is-on", "is-action");
    var a = toastAct; toastAct = null;
    if (typeof a === "function") a(); else GV.navigate(a);
  });

  /* ---------- корзина (в памяти + localStorage в try/catch) ---------- */
  var KEY = "grinchin.cart.v1";
  var items = [];
  function valid(i) { return i && byId[i.id] && byId[i.id].sizes.hasOwnProperty(i.size) && i.qty > 0; }
  if (Q.get("cart") === "demo") {
    items = [{ id: "suit-detour", size: "L", qty: 1 }, { id: "tee-blank", size: "L", qty: 2 }];
  } else if (!isShot) {
    try { items = (JSON.parse(localStorage.getItem(KEY)) || []).filter(valid); } catch (e) { items = []; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* без хранилища — живём в памяти */ } }
  function keyOf(i) { return i.id + "|" + i.size; }
  function count() { return items.reduce(function (a, i) { return a + i.qty; }, 0); }
  function total() { return items.reduce(function (a, i) { return a + byId[i.id].price * i.qty; }, 0); }
  function syncCart() {
    var c = count();
    $$("[data-cart-count]").forEach(function (el) { el.textContent = c; });
    var btn = $(".hd-cart");
    if (btn) { btn.setAttribute("aria-label", "Корзина, товаров: " + c); btn.dataset.count = c; }
    root.dataset.cart = c ? "full" : "empty";
    save();
    emit("grinchin:cart", {
      count: c,
      items: items.map(function (i) { var p = byId[i.id]; return { id: i.id, size: i.size, qty: i.qty, name: p.name, price: p.price }; })
    });
    if (stackTop() === "cart") renderCart();
  }
  var MAX_QTY = 5;
  GV.cart = {
    get items() { return items.slice(); },
    get count() { return count(); },
    get total() { return total(); },
    add: function (id, size, qty) {
      var p = byId[id];
      if (!p || !inStock(p, size)) return false;
      var it = items.filter(function (i) { return i.id === id && i.size === size; })[0];
      var limit = Math.min(MAX_QTY, p.sizes[size]);
      if (it) { if (it.qty >= limit) { GV.toast("Больше " + limit + " в одни руки не выйдет."); return false; } it.qty += qty || 1; }
      else items.push({ id: id, size: size, qty: qty || 1 });
      syncCart();
      emit("grinchin:add", { id: id, size: size });
      GV.toast("Есть. Вещь в корзине.");
      return true;
    },
    setQty: function (key, q) {
      var it = items.filter(function (i) { return keyOf(i) === key; })[0];
      if (!it) return;
      var p = byId[it.id];
      it.qty = Math.max(1, Math.min(q, Math.min(MAX_QTY, p.sizes[it.size] || 1)));
      syncCart();
    },
    remove: function (key) {
      items = items.filter(function (i) { return keyOf(i) !== key; });
      syncCart();
    },
    clear: function () { items = []; syncCart(); }
  };

  /* ---------- каталог: чипы + карточки ---------- */
  var grid = $("[data-grid]"), chips = $("[data-chips]");
  function cardHTML(p, idx) {
    var soldout = p.state === "soldout";
    var quick = soldout ? "" :
      '<div class="card-quick" role="group" aria-label="Быстро в корзину: ' + esc(p.name) + '"><span class="cq-label">в корзину:</span>' +
      sizesOf(p).map(function (s) {
        var ok = inStock(p, s);
        return '<button type="button" class="cq-size' + (ok ? "" : " is-out") + '" data-quick="' + p.id + '" data-size="' + s + '"' +
          (ok ? ' aria-label="' + s + ' — в корзину"' : ' disabled aria-label="' + s + ' — нет"') + ">" + s + "</button>";
      }).join("") + "</div>";
    return '<article class="card" data-id="' + p.id + '" data-state="' + p.state + '" data-cat="' + p.category + '">' +
      '<div class="card-media">' +
      '<img class="card-img" src="' + p.img[0] + '" alt="' + esc(p.name) + ' — эскиз, фото скоро" width="800" height="1000" decoding="async">' +
      '<img class="card-img card-img--alt" src="' + p.img[1] + '" alt="" aria-hidden="true" width="800" height="1000" decoding="async">' +
      '<div class="card-badges">' + badges(p) + "</div>" + quick +
      (idx === 5 ? '<span class="gm-slot" data-mark-slot="2"></span>' : "") +
      "</div>" +
      '<div class="card-body">' +
      '<h3 class="card-name"><button type="button" class="card-open" data-open-product="' + p.id + '">' + esc(p.name) + "</button></h3>" +
      '<p class="card-price">' + money(p.price) + "</p>" +
      "</div></article>";
  }
  if (grid) grid.innerHTML = P.map(cardHTML).join("");

  if (chips) {
    chips.innerHTML = CATS.map(function (c) {
      var n = c.id === "all" ? P.length : P.filter(function (p) { return p.category === c.id; }).length;
      if (!n) return "";
      return '<button type="button" class="chip" data-cat="' + c.id + '" aria-pressed="' + (c.id === "all") + '">' + esc(c.label) + "<sup>" + n + "</sup></button>";
    }).join("");
    chips.addEventListener("click", function (e) {
      var b = e.target.closest(".chip");
      if (!b) return;
      var cat = b.dataset.cat;
      $$(".chip", chips).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      $$(".card", grid).forEach(function (card) { card.hidden = !(cat === "all" || card.dataset.cat === cat); });
      grid.dataset.filter = cat;
    });
  }

  /* ---------- образы ---------- */
  var wall = $("[data-looks]");
  if (wall) {
    wall.innerHTML = LOOKS.map(function (l) {
      var ps = l.items.map(function (id) { return byId[id]; }).filter(Boolean);
      var sum = ps.reduce(function (a, p) { return a + p.price; }, 0);
      return '<figure class="look" data-look="' + l.n + '">' +
        '<div class="look-frame">' +
        '<div class="look-photo">' +
        '<span class="look-num" aria-hidden="true">’' + l.n + "</span>" +
        ps.map(function (p, i) { return '<img class="look-img look-img--' + (i + 1) + '" src="' + p.img[0] + '" alt="' + esc(p.name) + '" width="800" height="1000" decoding="async">'; }).join("") +
        "</div>" +
        '<span class="look-tape look-tape--a" aria-hidden="true"></span><span class="look-tape look-tape--b" aria-hidden="true"></span>' +
        '<div class="look-tag" aria-hidden="true"><span>look: ’' + l.n + "</span><span>вещей: " + ps.length + "</span><span>сумма: " + tagPrice(sum) + "</span></div>" +
        "</div>" +
        '<figcaption class="look-cap">' +
        '<p class="look-title"><span class="look-k">’' + l.n + "</span> " + esc(l.title) + "</p>" +
        '<ul class="look-items">' + ps.map(function (p) {
          return '<li><button type="button" data-open-product="' + p.id + '"><span>' + esc(p.name) + '</span><i aria-hidden="true">→</i></button></li>';
        }).join("") + "</ul></figcaption></figure>";
    }).join("");
  }

  /* ---------- карточка товара (шит) ---------- */
  var sheetBody = $("[data-ps-body]");
  var sheetState = { id: null, size: null };
  function accHTML(p) {
    var rows = [
      ["Детали", "<p>" + esc(p.desc) + "</p><ul>" + p.details.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "<li>Посадка: " + esc(p.fit.toLowerCase()) + "</li></ul>"],
      ["Состав и уход", "<p>" + esc(p.composition) + ".</p><p>" + esc(p.care) + ".</p>"],
      ["Доставка и предзаказ", "<p>Предзаказ до " + DROP.preorderTill + ", отправка с " + DROP.shipFrom + ". СДЭК или Почта, 2–7 дней. Весь заказ — одной посылкой.</p>"],
      ["Возврат", "<p>14 дней, если не носил и бирка на месте. Обмен размера — бесплатно.</p>"]
    ];
    return rows.map(function (r) { return '<details class="acc"><summary>' + r[0] + "</summary><div class=\"acc-body\">" + r[1] + "</div></details>"; }).join("");
  }
  function renderSheet(p) {
    sheetState = { id: p.id, size: null };
    var soldout = !anyStock(p);
    var pairs = (p.pairs || []).map(function (id) { return byId[id]; }).filter(Boolean);
    sheetBody.innerHTML =
      '<div class="ps-grid" data-state="' + p.state + '">' +
      '<div class="ps-gallery">' +
      '<div class="ps-track" tabindex="0" role="region" aria-label="Фото товара, листай">' +
      p.img.map(function (src, i) {
        return '<figure class="ps-slide"><img src="' + src + '" alt="' + esc(p.name) + (i ? " — деталь" : " — целиком") + ', эскиз" width="800" height="1000" decoding="async"></figure>';
      }).join("") + "</div>" +
      '<div class="ps-gnav"><button type="button" class="ps-arrow" data-gal="-1" aria-label="Предыдущее фото">←</button>' +
      '<p class="ps-count" aria-live="polite"><span data-ps-i>1</span>/' + p.img.length + "</p>" +
      '<button type="button" class="ps-arrow" data-gal="1" aria-label="Следующее фото">→</button></div>' +
      '<div class="tape-badges ps-badges">' + badges(p) + "</div>" +
      "</div>" +
      '<div class="ps-info">' +
      '<h2 id="ps-title" class="ps-title">' + esc(p.name) + "</h2>" +
      '<p class="ps-marker">' + esc(p.marker) + "</p>" +
      '<p class="ps-ship"><i aria-hidden="true"></i>' + stateText(p) + "</p>" +
      '<div class="ps-tag" aria-hidden="true"><div class="pt-cell"><span>size:</span><b data-ps-tagsize>' + (soldout ? "—" : "?") + '</b></div><div class="pt-cell"><span>price:</span><b>' + tagPrice(p.price) + "</b></div></div>" +
      '<div class="ps-sizes-head"><span class="mono-label">размер:</span><button type="button" class="link" data-open="sizes">Размерная сетка</button></div>' +
      '<div class="ps-sizes" role="group" aria-label="Размер">' +
      sizesOf(p).map(function (s) {
        var ok = inStock(p, s);
        return '<button type="button" class="sz' + (ok ? "" : " is-out") + '" data-size="' + s + '" aria-pressed="false"' +
          (ok ? "" : ' aria-label="' + s + ' — нет в наличии, можно подписаться"') + ">" + s + "</button>";
      }).join("") + "</div>" +
      '<p class="ps-model">' + esc(p.model) + "</p>" +
      '<div class="ps-notify" data-ps-notify hidden>' +
      '<p class="ps-notify-big">Этот маршрут закрыт. Сообщить, когда откроется?</p>' +
      '<form class="ps-notify-form" data-notify-form novalidate><label class="vh" for="ps-notify-input">Ник в Telegram или почта</label>' +
      '<input id="ps-notify-input" type="text" placeholder="@ник или почта" autocomplete="off">' +
      '<button type="submit" class="btn btn--dark">Сообщить</button></form>' +
      '<p class="field-err" data-notify-err></p></div>' +
      '<div class="ps-buy">' +
      '<button type="button" class="btn btn--accent btn--wide ps-add" data-ps-add aria-disabled="true">' + (soldout ? "Сообщить о поступлении" : "Выбери размер") + "</button>" +
      '<button type="button" class="link ps-gocart" data-open="cart" hidden>Открыть корзину →</button>' +
      "</div>" +
      '<div class="ps-acc">' + accHTML(p) + "</div>" +
      "</div>" +
      (pairs.length ?
        '<div class="ps-more"><h3 class="ps-more-title">С этим носят</h3><div class="ps-more-grid">' +
        pairs.map(function (q) {
          return '<button type="button" class="mini" data-open-product="' + q.id + '"><img src="' + q.img[0] + '" alt="" width="800" height="1000"><span class="mini-name">' + esc(q.name) + '</span><span class="mini-price">' + money(q.price) + "</span></button>";
        }).join("") + "</div></div>" : "") +
      "</div>";
    setAddLabel(p);
    var panel = $(".ps-panel");
    if (panel) panel.scrollTop = 0;
    var track = $(".ps-track", sheetBody);
    track.addEventListener("scroll", function () {
      var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      var el = $("[data-ps-i]", sheetBody);
      if (el) el.textContent = i + 1;
    }, { passive: true });
  }
  function sheetProduct() { return byId[sheetState.id]; }
  function setAddLabel(p) {
    var btn = $("[data-ps-add]", sheetBody);
    if (!btn) return;
    var s = sheetState.size;
    var out = s && !inStock(p, s);
    if (!s) { btn.textContent = anyStock(p) ? "Выбери размер" : "Сообщить о поступлении"; btn.setAttribute("aria-disabled", anyStock(p) ? "true" : "false"); }
    else if (out) { btn.textContent = "Сообщить о поступлении"; btn.setAttribute("aria-disabled", "false"); }
    else { btn.textContent = "В корзину · " + money(p.price); btn.setAttribute("aria-disabled", "false"); }
    btn.dataset.mode = !s ? (anyStock(p) ? "pick" : "notify") : out ? "notify" : "add";
  }
  function showNotify(on, focus) {
    var box = $("[data-ps-notify]", sheetBody);
    if (!box) return;
    box.hidden = !on;
    if (on && focus) { var inp = $("input", box); if (inp) inp.focus(); }
  }
  if (sheetBody) {
    sheetBody.addEventListener("click", function (e) {
      var p = sheetProduct();
      if (!p) return;
      var sz = e.target.closest(".sz");
      if (sz) {
        sheetState.size = sz.dataset.size;
        $$(".sz", sheetBody).forEach(function (b) { b.setAttribute("aria-pressed", String(b === sz)); });
        $("[data-ps-tagsize]", sheetBody).textContent = sz.dataset.size;
        $("#product-sheet").dataset.size = sz.dataset.size;
        setAddLabel(p);
        showNotify(sz.classList.contains("is-out"), false);
        return;
      }
      var gal = e.target.closest("[data-gal]");
      if (gal) {
        var tr = $(".ps-track", sheetBody);
        tr.scrollBy({ left: tr.clientWidth * Number(gal.dataset.gal), behavior: instant() ? "auto" : "smooth" });
        return;
      }
      var add = e.target.closest("[data-ps-add]");
      if (add) {
        var mode = add.dataset.mode || (anyStock(p) ? "pick" : "notify");
        if (mode === "pick") {
          var g = $(".ps-sizes", sheetBody);
          g.classList.remove("is-nudge"); void g.offsetWidth; g.classList.add("is-nudge");
          GV.toast("Сначала размер — потом маршрут.");
          var first = $(".sz:not(.is-out)", sheetBody); if (first) first.focus();
          return;
        }
        if (mode === "notify") { showNotify(true, true); return; }
        if (GV.cart.add(p.id, sheetState.size)) {
          add.textContent = "Есть. Вещь в корзине";
          add.classList.add("is-done");
          var go = $(".ps-gocart", sheetBody); if (go) go.hidden = false;
          setTimeout(function () { add.classList.remove("is-done"); setAddLabel(p); }, 1600);
        }
      }
    });
    sheetBody.addEventListener("submit", function (e) {
      var f = e.target.closest("[data-notify-form]");
      if (!f) return;
      e.preventDefault();
      var v = $("input", f).value.trim(), err = $("[data-notify-err]", sheetBody);
      if (!isTg(v) && !isMail(v)) { err.textContent = "Нужен ник в Telegram или почта."; $("input", f).setAttribute("aria-invalid", "true"); return; }
      err.textContent = "";
      var box = $("[data-ps-notify]", sheetBody);
      box.innerHTML = '<p class="ps-notify-big">Есть. Напишем, если вернётся.</p>';
    });
  }

  /* ---------- корзина-drawer ---------- */
  var cartBody = $("[data-cart-body]");
  var cartDemo = false;
  function upsell() {
    var inCart = {};
    items.forEach(function (i) { inCart[i.id] = 1; });
    var cand = [];
    items.forEach(function (i) { (byId[i.id].pairs || []).forEach(function (id) { cand.push(id); }); });
    cand = cand.concat(P.map(function (p) { return p.id; }));
    for (var k = 0; k < cand.length; k++) { var p = byId[cand[k]]; if (p && !inCart[p.id] && anyStock(p)) return p; }
    return null;
  }
  function renderCart() {
    if (!cartBody) return;
    if (!items.length) {
      cartBody.innerHTML = '<div class="cart-empty"><div class="smirk" data-mood="sad"></div>' +
        '<p class="cart-empty-big">Пока пусто.<br>Маршрут не задан.</p>' +
        '<button type="button" class="btn btn--accent" data-nav="drop">Выбрать свой <span aria-hidden="true">→</span></button></div>';
      return;
    }
    var pre = items.some(function (i) { return byId[i.id].state === "preorder"; });
    var up = upsell();
    cartBody.innerHTML =
      '<ul class="cart-list">' + items.map(function (i) {
        var p = byId[i.id], k = keyOf(i);
        return '<li class="cart-item">' +
          '<button type="button" class="ci-thumb" data-open-product="' + p.id + '" aria-label="Открыть: ' + esc(p.name) + '"><img src="' + p.img[0] + '" alt="" width="800" height="1000"></button>' +
          '<div class="ci-info"><p class="ci-name">' + esc(p.name) + '</p><p class="ci-meta">size: ' + i.size + "</p>" +
          (p.state === "preorder" ? '<p class="ci-pre">предзаказ · с ' + DROP.shipFrom + "</p>" : "") +
          '<div class="ci-row"><div class="qty" role="group" aria-label="Количество: ' + esc(p.name) + '">' +
          '<button type="button" data-qty="-1" data-key="' + k + '" aria-label="Меньше"' + (i.qty <= 1 ? " disabled" : "") + ">−</button>" +
          '<output aria-live="polite">' + i.qty + "</output>" +
          '<button type="button" data-qty="1" data-key="' + k + '" aria-label="Больше">+</button></div>' +
          '<button type="button" class="ci-remove" data-remove="' + k + '">Убрать</button></div></div>' +
          '<p class="ci-price">' + money(p.price * i.qty) + "</p></li>";
      }).join("") + "</ul>" +
      (up ? '<div class="cart-up"><p class="mono-label">дополни маршрут:</p><button type="button" class="cu-card" data-open-product="' + up.id + '"><img src="' + up.img[0] + '" alt="" width="800" height="1000">' +
        '<span class="cu-name">' + esc(up.name) + '</span><span class="cu-price">' + money(up.price) + '</span><span class="cu-go" aria-hidden="true">→</span></button></div>' : "") +
      '<div class="cart-foot">' +
      (pre ? '<p class="cart-pre">Отправим всё вместе с ' + DROP.shipFrom + ".</p>" : "") +
      '<dl class="cart-sum"><div><dt>доставка:</dt><dd>при оформлении</dd></div>' +
      '<div class="cart-total"><dt>итого:</dt><dd>' + money(total()) + "</dd></div></dl>" +
      (cartDemo ?
        '<div class="cart-demo" tabindex="-1"><p class="cart-demo-big">Это демо.</p><p>Оплата — к старту продаж. Корзина сохранится.</p>' +
        '<button type="button" class="btn btn--ghost-dark btn--wide" data-nav="next">Сообщить о старте →</button></div>' :
        '<button type="button" class="btn btn--accent btn--wide" data-checkout>Оформить · ' + money(total()) + "</button>") +
      "</div>";
  }
  if (cartBody) {
    cartBody.addEventListener("click", function (e) {
      var q = e.target.closest("[data-qty]");
      if (q) {
        var it = items.filter(function (i) { return keyOf(i) === q.dataset.key; })[0];
        if (it) { GV.cart.setQty(q.dataset.key, it.qty + Number(q.dataset.qty)); var again = $('[data-qty="' + q.dataset.qty + '"][data-key="' + q.dataset.key + '"]', cartBody); if (again && !again.disabled) again.focus(); }
        return;
      }
      var r = e.target.closest("[data-remove]");
      if (r) { GV.cart.remove(r.dataset.remove); var f = $("button, [href]", cartBody); if (f) f.focus(); return; }
      if (e.target.closest("[data-checkout]")) {
        cartDemo = true; renderCart();
        var demo = $(".cart-demo", cartBody); if (demo) demo.focus();
      }
    });
  }

  /* ---------- оверлеи: стек, фокус-ловушка, Esc, блокировка скролла ---------- */
  var OV = { product: "product-sheet", cart: "cart-drawer", sizes: "size-modal", "404": "page-404", menu: "mobile-menu", game: "game-help" };
  var STACKABLE = { sizes: 1 }; // размерная сетка ложится поверх карточки
  var stack = [];
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  function stackTop() { return stack.length ? stack[stack.length - 1].name : null; }
  function setInert() {
    var on = stack.length > 0;
    $$("#status, #header, #main, #footer, body > .tape-run, .skip").forEach(function (el) { el.inert = on; });
    Object.keys(OV).forEach(function (n) {
      var el = d.getElementById(OV[n]);
      if (el) el.inert = on && stackTop() !== n && !el.hidden ? true : false;
    });
  }
  function lock(on) {
    if (on) { root.style.setProperty("--sbw", (window.innerWidth - root.clientWidth) + "px"); root.classList.add("is-locked"); }
    else { root.classList.remove("is-locked"); root.style.removeProperty("--sbw"); }
  }
  function focusIn(el) {
    // фокус на саму панель: скринридер читает диалог, а Tab ведёт к первому контролу
    var t = $(".ov-panel", el) || $(FOCUSABLE, el);
    if (!t) return;
    if (!t.hasAttribute("tabindex")) t.setAttribute("tabindex", "-1");
    t.focus({ preventScroll: true });
  }
  function hideEl(el) {
    el.classList.remove("is-open");
    var done = function () { if (!el.classList.contains("is-open")) el.hidden = true; };
    if (instant()) done(); else setTimeout(done, 260);
  }
  function popOne(restore) {
    var s = stack.pop();
    if (!s) return;
    hideEl(s.el);
    if (s.name === "menu") { var b = $(".hd-burger"); if (b) b.setAttribute("aria-expanded", "false"); }
    if (s.name === "cart") cartDemo = false;
    emit("grinchin:overlay", { name: s.name, open: false });
    if (stack.length) root.dataset.overlay = stackTop(); else { delete root.dataset.overlay; lock(false); }
    setInert();
    if (restore !== false) {
      var o = s.opener;
      if (o && d.contains(o) && !o.closest("[inert]")) o.focus({ preventScroll: true });
      else if (stack.length) focusIn(stack[stack.length - 1].el);
    }
  }
  GV.open = function (name, arg, opts) {
    var el = d.getElementById(OV[name]);
    if (!el) return false;
    opts = opts || {};
    if (name === "product") {
      if (!byId[arg]) return GV.open("404");
      renderSheet(byId[arg]);
      if (opts.notify) { showNotify(true, false); }
    }
    if (name === "cart") renderCart();
    if (name === "game" && toastEl) toastEl.classList.remove("is-on", "is-action"); // окно само говорит, что случилось
    var opener = d.activeElement;
    var at = stack.map(function (s) { return s.name; }).indexOf(name);
    if (at > -1) {
      // уже открыт: снять всё, что выше, и остаться на нём (перерендер уже сделан)
      while (stack.length - 1 > at) popOne(false);
      focusIn(el);
      if (opts.notify) showNotify(true, true);
      return true;
    }
    if (!STACKABLE[name] && stack.length) {
      // замена оверлея (корзина → карточка): фокус потом вернём туда, откуда открывали первый
      opener = stack[0].opener;
      while (stack.length) popOne(false);
    }
    stack.push({ name: name, el: el, opener: opener });
    el.hidden = false;
    el.style.zIndex = String(80 + stack.length); // --z-overlay + глубина
    if (instant()) el.classList.add("is-open");
    else { void el.offsetWidth; requestAnimationFrame(function () { el.classList.add("is-open"); }); }
    lock(true);
    root.dataset.overlay = name;
    setInert();
    if (name === "menu") { var b = $(".hd-burger"); if (b) b.setAttribute("aria-expanded", "true"); }
    focusIn(el);
    if (opts.notify) showNotify(true, true);
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
    var f = $$(FOCUSABLE, el).filter(function (x) { return x.offsetParent !== null || x === d.activeElement; });
    if (!f.length) { e.preventDefault(); return; }
    var first = f[0], last = f[f.length - 1];
    if (!el.contains(d.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- навигация (B может перехватить preventDefault и проиграть переход лентой) ---------- */
  GV.navigate = function (target) {
    var t = d.getElementById(target);
    if (!t) return GV.open("404");
    var go = function () {
      var free = emit("grinchin:navigate", { target: target }, true);
      if (free) t.scrollIntoView({ behavior: instant() ? "auto" : "smooth", block: "start" });
      try { history.replaceState(null, "", "#" + target); } catch (e) { /* file:// и песочница */ }
      if (!t.hasAttribute("tabindex")) t.setAttribute("tabindex", "-1");
      t.focus({ preventScroll: true });
    };
    if (stack.length) { GV.closeAll(); setTimeout(go, instant() ? 0 : 120); } else go();
  };

  d.addEventListener("click", function (e) {
    var t = e.target;
    var quick = t.closest("[data-quick]");
    if (quick) { e.preventDefault(); GV.cart.add(quick.dataset.quick, quick.dataset.size); return; }
    var op = t.closest("[data-open-product]");
    if (op) { e.preventDefault(); GV.open("product", op.dataset.openProduct, { notify: op.hasAttribute("data-notify") }); return; }
    var o = t.closest("[data-open]");
    if (o) { e.preventDefault(); GV.open(o.dataset.open); return; }
    var nav = t.closest("[data-nav]");
    if (nav) { e.preventDefault(); GV.navigate(nav.dataset.nav); return; }
    var c = t.closest("[data-close]");
    if (c) {
      e.preventDefault();
      if (c.hasAttribute("data-home")) { GV.closeAll(); GV.navigate("hero"); }
      else GV.close();
    }
  });
  // логотип ведёт наверх через ту же навигацию
  var logo = d.getElementById("logo");
  if (logo) logo.addEventListener("click", function (e) { e.preventDefault(); GV.navigate("hero"); });

  /* ---------- подписка на перезапуск (только интерфейс, без сети) ---------- */
  function isTg(v) { return /^@?[A-Za-z0-9_]{5,32}$/.test(v); }
  function isMail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
  var sub = $("[data-sub]");
  if (sub) {
    var inp = $("[data-sub-input]", sub), lab = $("[data-sub-label]", sub), err = $("[data-sub-err]", sub);
    var CH = {
      tg: { label: "ник в Telegram:", ph: "@твой_ник", type: "text", mode: "text", ok: isTg, bad: "Ник — от 5 символов: латиница, цифры, _.", done: "Напишем в Telegram." },
      email: { label: "почта:", ph: "имя@почта.ру", type: "email", mode: "email", ok: isMail, bad: "Похоже, в почте опечатка.", done: "Напишем на почту." }
    };
    var ch = function () { var r = $('input[name="ch"]:checked', sub); return CH[r ? r.value : "tg"]; };
    sub.addEventListener("change", function (e) {
      if (e.target.name !== "ch") return;
      var c = ch();
      lab.textContent = c.label; inp.placeholder = c.ph; inp.type = c.type; inp.inputMode = c.mode;
      err.textContent = ""; inp.removeAttribute("aria-invalid"); inp.value = "";
    });
    sub.addEventListener("submit", function (e) {
      e.preventDefault();
      var c = ch(), v = inp.value.trim();
      if (!c.ok(v)) { err.textContent = c.bad; inp.setAttribute("aria-invalid", "true"); inp.focus(); return; }
      err.textContent = ""; inp.removeAttribute("aria-invalid");
      sub.classList.add("is-done");
      var done = $("[data-sub-done]", sub);
      $("[data-sub-done-text]", sub).textContent = c.done;
      done.hidden = false; done.focus();
    });
  }

  /* ---------- события соседей ---------- */
  d.addEventListener("grinchin:mark", function (e) {
    var x = e.detail || {};
    var n = Array.isArray(x.found) ? x.found.length : x.n;
    if (x.source === "street") GV.toast("Метка с улицы засчитана · " + n + "/" + (x.total || 5), 4200);
    else if (n < (x.total || 5)) GV.toast("Метка " + n + "/" + (x.total || 5));
  });
  d.addEventListener("grinchin:gather-complete", function () {
    root.dataset.gather = "done";
    GV.toast("5/5. Маршрут сошёлся → забрать код", 6000, "gather");
  });

  /* ---------- ?open=… после grinchin:ready (или сразу при shot=1) ---------- */
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
  if (isShot) applyOpen();
  else {
    d.addEventListener("grinchin:ready", applyOpen, { once: true });
    setTimeout(applyOpen, 4000); // если моушн-модуль не прислал ready
  }

  syncCart();
  GV.products = P;
  GV.byId = byId;
  GV.money = money;
})();
