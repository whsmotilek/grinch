/* GRINCHIN v2 — каркас и магазин. Владелец: K1.
   window.GV: open/close оверлеев (стек, фокус-ловушка, Esc, inert, блокировка скролла), корзина, навигация
   (свой плавный скролл, без wipe), тост. Рендер сетки дропа, карточки товара, корзины.
   События (CONTRACT_V2): шлём grinchin:cart {count,items} / :add {id,size} / :overlay {name,open} / :navigate {target};
   слушаем grinchin:ready (после него — ?open=…).
   Query: ?shot=1 — без анимаций и прелоадера; &open=product:<id>|cart|sizes|menu|404; &cart=demo — две вещи в корзине. */
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

  /* ---------- утилиты ---------- */
  var nf = new Intl.NumberFormat("ru-RU");
  function money(n) { return nf.format(n).replace(/\s/g, " ") + " ₽"; }
  function plain(n) { return nf.format(n).replace(/\s/g, " "); }
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
    return { text: "ПРЕДЗАКАЗ", alert: false };
  }
  function shipText(p) { return anyStock(p) ? "предзаказ · отправка с " + DROP.shipFrom : "разобрали"; }
  var ARROW = '<svg class="gl" viewBox="0 0 16 12" aria-hidden="true"><path d="M0 6h14.5M9.5 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
  // грустная улыбка пустой корзины: та же дуга знака, перевёрнутая, без рогов
  var SMILE_SVG = '<svg viewBox="0 0 96 28" aria-hidden="true"><path d="M3 25C20 8 34 4 48 4s28 4 45 21" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  // маркер выбранного размера: стрелка с квадратным концом, как перекладина G
  var MARK_SVG = '<svg viewBox="0 0 10 12" aria-hidden="true"><path d="M5 12V1.5M1 5.5l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>';

  /* ---------- тост ---------- */
  var toastEl = d.getElementById("toast"), toastT;
  GV.toast = function (msg, ms) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove("is-on"); }, ms || 2400);
  };

  /* ---------- корзина: в памяти + localStorage (в try/catch) ---------- */
  var KEY = "grinchin.cart.v2";
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
  function syncCart() {
    var c = count();
    $$("[data-cart-count]").forEach(function (el) { el.textContent = c; });
    var btn = $(".hd-cart");
    if (btn) btn.setAttribute("aria-label", "Корзина, товаров: " + c);
    root.dataset.cart = c ? "full" : "empty";
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
  function cardHTML(p) {
    var st = statusOf(p), sizes = sizesOf(p);
    var row = anyStock(p) && canHover ?
      '<div class="card-sizes" role="group" aria-label="Быстро в корзину: ' + esc(p.name) + '" style="--n:' + sizes.length + '">' +
      sizes.map(function (s) {
        var ok = inStock(p, s);
        return '<button type="button" class="cell cs' + (ok ? "" : " is-out") + '" data-quick="' + p.id + '" data-size="' + s + '"' +
          (ok ? ' aria-label="' + s + ' — в корзину"' : ' aria-disabled="true" tabindex="-1" aria-label="' + s + ' — нет"') + ">" + s + "</button>";
      }).join("") + "</div>" : "";
    return '<article class="card" data-id="' + p.id + '" data-state="' + (anyStock(p) ? p.state : "soldout") + '">' +
      '<div class="card-media">' +
      '<img class="card-img" src="' + p.img[0] + '" alt="' + esc(p.name) + ' — эскиз" width="800" height="1000" decoding="async">' +
      (canHover ? '<img class="card-img card-img--alt" src="' + p.img[1] + '" alt="" aria-hidden="true" width="800" height="1000" loading="lazy" decoding="async">' : "") +
      row + "</div>" +
      '<div class="card-body">' +
      '<p class="card-num">' + num(p) + "</p>" +
      '<p class="card-status' + (st.alert ? " is-alert" : "") + '">' + st.text + "</p>" +
      '<h3 class="card-name"><button type="button" class="card-open" data-open-product="' + p.id + '">' + esc(p.name) + "</button></h3>" +
      '<p class="card-color">[' + esc(p.color) + "]</p>" +
      '<p class="card-price">' + money(p.price) + "</p>" +
      "</div></article>";
  }
  if (grid) grid.innerHTML = P.map(cardHTML).join("");
  if (grid) grid.addEventListener("click", function (e) {
    var row = e.target.closest(".card-sizes");
    if (row) {
      // ряд размеров перехватывает клики сам: карточка не открывается
      e.stopPropagation();
      var b = e.target.closest("[data-quick]");
      if (!b || b.getAttribute("aria-disabled") === "true") return;
      if (GV.cart.add(b.dataset.quick, b.dataset.size)) {
        b.classList.add("is-added");
        setTimeout(function () { b.classList.remove("is-added"); }, 700);
      }
      return;
    }
    var card = e.target.closest(".card");
    if (card) {
      e.stopPropagation();
      var ob = $(".card-open", card); if (ob && d.activeElement !== ob) ob.focus({ preventScroll: true }); // сюда вернётся фокус
      GV.open("product", card.dataset.id);
    }
  });

  /* ---------- карточка товара (шит) ---------- */
  var sheet = d.getElementById("product-sheet");
  var sheetBody = $("[data-ps-body]");
  var cur = { id: null, size: null };
  function lookOf(p) { return LOOKS.filter(function (l) { return (l.items || []).indexOf(p.id) > -1; })[0]; }
  function renderSheet(p) {
    cur = { id: p.id, size: null };
    var sizes = sizesOf(p), all = anyStock(p);
    var pairs = (p.pairs || []).map(function (id) { return byId[id]; }).filter(Boolean);
    var look = lookOf(p);
    sheetBody.innerHTML =
      '<div class="ps-grid" data-state="' + (all ? p.state : "soldout") + '">' +
      '<div class="ps-gallery">' +
      '<div class="ps-track" tabindex="0" role="region" aria-label="Эскизы, листай">' +
      p.img.map(function (src, i) {
        return '<figure class="ps-slide"><img src="' + src + '" alt="' + esc(p.name) + (i ? " — деталь, эскиз" : " — эскиз") + '" width="800" height="1000" decoding="async"></figure>';
      }).join("") + "</div>" +
      '<p class="ps-count" aria-hidden="true"><span data-ps-i>1</span>/' + p.img.length + "</p>" +
      "</div>" +
      '<div class="ps-info">' +
      '<p class="ps-num">' + num(p) + "</p>" +
      '<h2 id="ps-title" class="ps-title">' + esc(p.name) + "</h2>" +
      '<p class="ps-line"><span>[' + esc(p.color) + ']</span><span class="ps-price">' + money(p.price) + "</span></p>" +
      '<p class="ps-ship">' + shipText(p) + "</p>" +
      '<p class="ps-desc">' + esc(p.desc) + "</p>" +
      '<div class="ps-tag" aria-hidden="true"><div class="pt-cell"><span>size:</span><b data-ps-tagsize>' + (all ? "?" : "—") + '</b></div>' +
      '<div class="pt-cell"><span>price:</span><b>' + plain(p.price) + "</b></div></div>" +
      '<div class="ps-sizes-head"><span class="t-mono">размер:</span><button type="button" class="link" data-open="sizes">Размерная сетка</button></div>' +
      '<div class="ps-sizes" role="group" aria-label="Размер" style="--n:' + sizes.length + '">' +
      sizes.map(function (s) {
        var ok = inStock(p, s);
        return '<button type="button" class="cell sz' + (ok ? "" : " is-out") + '" data-size="' + s + '" aria-pressed="false"' +
          (ok ? "" : ' aria-label="' + s + ' — нет"') + ">" + s + "</button>";
      }).join("") +
      '<span class="sz-mark" aria-hidden="true">' + MARK_SVG + "</span></div>" +
      '<dl class="kv ps-fit"><div><dt>посадка:</dt><dd>' + esc(p.fit) + "</dd></div><div><dt>модель:</dt><dd>" + esc(p.model) + "</dd></div></dl>" +
      '<div class="ps-notify" data-ps-notify hidden>' +
      '<p data-notify-head></p>' +
      '<form class="ps-notify-form" data-notify-form novalidate><label class="vh" for="ps-notify-input">Ник в Telegram или почта</label>' +
      '<input id="ps-notify-input" type="text" placeholder="@ник или почта" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="ps-notify-err">' +
      '<button type="submit" class="btn btn--dark">Сообщить</button></form>' +
      '<p class="field-err" id="ps-notify-err" data-notify-err></p></div>' +
      '<div class="ps-buy">' +
      '<button type="button" class="btn ps-add" data-ps-add></button>' +
      '<button type="button" class="link ps-gocart" data-open="cart">Корзина' + ARROW + '</button>' +
      "</div>" +
      '<div class="ps-acc">' +
      acc("Состав и уход", "<p>" + esc(p.composition) + ".</p><p>" + esc(p.care) + ".</p>") +
      acc("Доставка и предзаказ", "<p>Предзаказ до " + DROP.preorderTill + ", отправка с " + DROP.shipFrom + ". СДЭК или Почта России, 2–7 дней.</p>") +
      acc("Возврат", "<p>14 дней, если вещь не носили и бирка на месте. Обмен размера — бесплатно.</p>") +
      "</div></div>" +
      ((pairs.length || look) ?
        '<div class="ps-more"><div class="ps-more-head"><h3 class="t-h3">С этим</h3>' +
        (look ? '<button type="button" class="link" data-look-go="' + look.n + '">Из образа ’' + look.n + ARROW + "</button>" : "") + "</div>" +
        '<div class="ps-more-grid">' + pairs.map(function (q) {
          return '<button type="button" class="mini" data-open-product="' + q.id + '"><img src="' + q.img[0] + '" alt="" width="800" height="1000" decoding="async">' +
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
    mode = mode || (!anyStock(p) ? "notify-all" : !s ? "pick" : out ? "notify" : "add");
    var label = {
      pick: "Выбери размер",
      add: "В корзину · " + money(p.price),
      done: "В корзине ✓",
      notify: "Сообщить, когда будет",
      "notify-all": "Сообщить о перезапуске"
    }[mode];
    btn.textContent = label;
    btn.dataset.mode = mode === "notify-all" ? "notify" : mode;
    btn.setAttribute("aria-disabled", mode === "pick" ? "true" : "false");
  }
  function moveMark(b) {
    var mark = $(".sz-mark", sheetBody), box = $(".ps-sizes", sheetBody);
    if (!mark || !box) return;
    if (!b) { mark.classList.remove("is-on"); return; }
    box.style.setProperty("--cw", b.offsetWidth + "px");
    box.style.setProperty("--mx", b.offsetLeft + "px");
    // первый показ — без проезда от левого края
    if (!mark.classList.contains("is-on")) { mark.style.transition = "none"; void mark.offsetWidth; mark.style.transition = ""; }
    mark.classList.add("is-on");
  }
  function showNotify(on, focus) {
    var box = $("[data-ps-notify]", sheetBody), p = sheetProduct();
    if (!box || !p) return;
    box.hidden = !on;
    if (on) $("[data-notify-head]", box).textContent = anyStock(p) ? (cur.size || "Размер") + " — нет. Напишем, когда будет." : "Разобрали. Напишем о перезапуске.";
    if (on && focus) { var inp = $("input", box); if (inp) inp.focus(); }
  }
  var doneT;
  if (sheetBody) {
    sheetBody.addEventListener("click", function (e) {
      var p = sheetProduct();
      if (!p) return;
      var sz = e.target.closest(".sz");
      if (sz) {
        cur.size = sz.dataset.size;
        $$(".sz", sheetBody).forEach(function (b) { b.setAttribute("aria-pressed", String(b === sz)); });
        var tag = $("[data-ps-tagsize]", sheetBody); if (tag) tag.textContent = sz.dataset.size;
        moveMark(sz);
        clearTimeout(doneT);
        setBuy(p);
        if (!sz.classList.contains("is-out")) showNotify(false);
        return;
      }
      var add = e.target.closest("[data-ps-add]");
      if (add) {
        var mode = add.dataset.mode;
        if (mode === "pick") {
          var g = $(".ps-sizes", sheetBody);
          g.classList.remove("is-nudge"); void g.offsetWidth; g.classList.add("is-nudge");
          GV.toast("Сначала размер.");
          var first = $(".sz:not(.is-out)", sheetBody); if (first) first.focus();
          return;
        }
        if (mode === "notify") { showNotify(true, true); return; }
        if (mode === "done") return;
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
  function renderCart() {
    if (!cartBody) return;
    if (!items.length) {
      cartBody.innerHTML = '<div class="cart-empty"><span class="smile-sad" aria-hidden="true">' + SMILE_SVG + "</span>" +
        '<p class="cart-empty-big">Пусто.</p>' +
        '<button type="button" class="btn btn--dark" data-nav="drop">Смотреть дроп ' + ARROW + "</button></div>";
      return;
    }
    var pre = items.some(function (i) { return anyStock(byId[i.id]); });
    var up = upsell();
    cartBody.innerHTML =
      '<ul class="cart-list">' + items.map(function (i) {
        var p = byId[i.id], k = keyOf(i), lim = limitOf(i.id, i.size);
        return '<li class="cart-item">' +
          '<button type="button" class="ci-thumb" data-open-product="' + p.id + '" aria-label="Открыть: ' + esc(p.name) + '"><img src="' + p.img[0] + '" alt="" width="800" height="1000"></button>' +
          '<div class="ci-info"><p class="ci-name">' + esc(p.name) + '</p><p class="t-mono ci-meta">size: ' + i.size + "<br>предзаказ · с " + DROP.shipFrom + "</p></div>" +
          '<p class="ci-price">' + money(p.price * i.qty) + "</p>" +
          '<div class="ci-row"><div class="qty" role="group" aria-label="Количество: ' + esc(p.name) + '">' +
          '<button type="button" class="cell" data-qty="-1" data-key="' + k + '" aria-label="Меньше"' + (i.qty <= 1 ? " disabled" : "") + ">−</button>" +
          '<output class="cell" aria-live="polite">' + i.qty + "</output>" +
          '<button type="button" class="cell" data-qty="1" data-key="' + k + '" aria-label="Больше"' + (i.qty >= lim ? ' aria-disabled="true"' : "") + ">+</button></div>" +
          '<button type="button" class="ci-remove" data-remove="' + k + '">Убрать</button></div></li>';
      }).join("") + "</ul>" +
      (up ? '<div class="cart-up"><p class="t-mono">С этим</p><button type="button" class="cu-card" data-open-product="' + up.id + '"><img src="' + up.img[0] + '" alt="" width="800" height="1000">' +
        '<span class="ci-name">' + esc(up.name) + '</span><span class="ci-price">' + money(up.price) + '</span><span class="cu-go" aria-hidden="true">' + ARROW + "</span></button></div>" : "") +
      '<div class="cart-foot">' +
      '<dl class="kv cart-sum"><div><dt>доставка:</dt><dd>при оформлении</dd></div>' +
      '<div class="cart-total"><dt>итого:</dt><dd>' + money(total()) + "</dd></div></dl>" +
      (pre ? '<p class="t-mono cart-pre">Отправим всё вместе ' + DROP.shipFrom + ".</p>" : "") +
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
      GV.cart.remove(r.dataset.remove);
      var f = $(".ci-remove, .cart-empty .btn", cartBody); if (f) f.focus();
      return;
    }
    if (e.target.closest("[data-checkout]")) {
      cartDemo = true; renderCart();
      var demo = $(".cart-demo", cartBody); if (demo) demo.focus();
    }
  });

  /* ---------- оверлеи ---------- */
  var OV = { product: "product-sheet", cart: "cart-drawer", sizes: "size-modal", "404": "page-404", menu: "mobile-menu" };
  var STACKABLE = { sizes: 1 }; // размерная сетка ложится поверх карточки
  var stack = [];
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  function stackTop() { return stack.length ? stack[stack.length - 1].name : null; }
  function isOpen(n) { return stack.some(function (s) { return s.name === n; }); }
  function setInert() {
    var on = stack.length > 0;
    $$("body > :not(.ov):not(script):not(template):not(#toast):not(#loader)").forEach(function (el) { el.inert = on; });
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
    // фокус на панель: скринридер читает диалог, Tab ведёт к первому контролу
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
      if (o && d.contains(o) && !o.closest("[inert]") && o !== d.body) o.focus({ preventScroll: true });
      else if (stack.length) focusIn(stack[stack.length - 1].el);
    }
  }
  GV.open = function (name, arg) {
    var el = d.getElementById(OV[name]);
    if (!el) return false;
    if (name === "product") {
      if (!byId[arg]) return GV.open("404");
      renderSheet(byId[arg]);
    }
    if (name === "cart") renderCart();
    var opener = d.activeElement;
    var at = stack.map(function (s) { return s.name; }).indexOf(name);
    if (at > -1) {
      while (stack.length - 1 > at) popOne(false);
      focusIn(el);
      return true;
    }
    if (!STACKABLE[name] && stack.length) {
      // замена (корзина → карточка): фокус потом вернём туда, откуда открывали первый
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
    if (name === "menu") { var b = $(".hd-burger"); if (b) b.setAttribute("aria-expanded", "true"); }
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
    var f = $$(FOCUSABLE, el).filter(function (x) { return x.getClientRects().length && !x.closest("[hidden]"); });
    if (!f.length) { e.preventDefault(); return; }
    var first = f[0], last = f[f.length - 1];
    if (!el.contains(d.activeElement) || d.activeElement === $(".ov-panel", el)) {
      if (e.shiftKey) { e.preventDefault(); last.focus(); } else if (!el.contains(d.activeElement)) { e.preventDefault(); first.focus(); }
    }
    else if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
  });

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
  GV.navigate = function (target, opts) {
    opts = opts || {};
    var t = d.getElementById(target);
    if (!t) return GV.open("404");
    var go = function () {
      emit("grinchin:navigate", { target: target });
      var el = (opts.look && $('[data-look="' + opts.look + '"]', t)) || t;
      var hh = ($("#header") || {}).offsetHeight || 0;
      var y = target === "hero" ? 0 : el.getBoundingClientRect().top + window.scrollY - hh;
      GV.scrollTo(y);
      try { history.replaceState(null, "", target === "hero" ? location.pathname + location.search : "#" + target); } catch (e) { /* file:// и песочница */ }
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
    if (o) { e.preventDefault(); GV.open(o.dataset.open); return; }
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

  /* ---------- активный пункт шапки: только пока его раздел на экране ---------- */
  var navLinks = $$(".hd-nav [data-nav]");
  if (navLinks.length && "IntersectionObserver" in window) {
    var vis = {};
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { vis[x.target.id] = x.isIntersecting; });
      navLinks.forEach(function (l) { l.classList.toggle("is-active", !!vis[l.dataset.nav]); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach(function (l) { var s = d.getElementById(l.dataset.nav); if (s) io.observe(s); });
  }

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
