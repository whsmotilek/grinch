/* GRINCHIN v4.2 · ЛИЧНЫЙ КАБИНЕТ (фронт). Владелец: A2. Разметка-оболочка — account.html, стили — account.css.
   Контракт данных — A1: ~/Проекты/GV/v4/lk/api.yaml (0.1.0-draft). Пути и методы — таблица ROUTES ниже: правка контракта = правка таблицы.

   window.GV.account
     .open(screen?, arg?) / .close() / .isOpen      — то же, что GV.open('account', screen)
     .authed / .user / .adapter ('demo'|'api')
     .fav.has(id) / .fav.toggle(id) / .fav.list()    — избранное (гость — на устройстве, после входа сливается в аккаунт)
     .restock.add([{product_id, size}])               — «Разобрали — вернём» (гость — запоминаем цель БЕЗ контакта, после входа переносим)
     .call(name, params, body)                        — сырой вызов адаптера (для соседей)
   Событие: grinchin:account {authenticated, user} — после входа/выхода/загрузки сессии.
   Адаптеры (одна настройка — #gv-account-config "adapter"):
     demo — ничего не отправляет в сеть; аккаунт живёт в памяти + sessionStorage вкладки; на экране плашка «демо-режим».
     api  — fetch(baseUrl + путь, {credentials:'include'}), X-CSRF-Token из GET /auth/session; ошибки — problem+json.
   Query: ?lk=<экран> — открыть кабинет (shot/возврат с VK ID) · ?login=ok|consent — возврат с VK ID (A1) ·
          &lkdemo=1 — демо сразу с вошедшим покупателем (кадры) · на localhost: &lkadapter=api&lkbase=<url> — проверка против мока A1.
   Связи с соседями (их файлы не правим): оборачиваем GV.open/close/closeAll/navigate (оверлей 'account' вне стека shop.js),
   сердечко — инъекцией в .card и .ps-info (MutationObserver), подписки — по submit формы «Сообщить» в карточке и grinchin:subscribe. */
(function () {
  "use strict";
  const d = document, root = d.documentElement, W = window;
  const GV = (W.GV = W.GV || {});
  if (GV.account && GV.account.v) return;
  const ov = d.getElementById("account-sheet");
  if (!ov) return;
  const panel = ov.querySelector(".ac-panel"), body = ov.querySelector("[data-ac-body]");
  const titleEl = d.getElementById("ac-title"), backEl = ov.querySelector("[data-ac-back]"), demoEl = ov.querySelector("[data-ac-demo]");

  /* ---------- окружение ---------- */
  let Q; try { Q = new URLSearchParams(location.search); } catch (e) { Q = new Map(); }
  const isShot = root.dataset.shot === "1";
  const reduced = W.matchMedia && W.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const instant = () => isShot || reduced;
  const $ = (s, c) => (c || d).querySelector(s);
  const $$ = (s, c) => Array.prototype.slice.call((c || d).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const emit = (n, det) => d.dispatchEvent(new CustomEvent(n, { detail: det }));
  const nf = new Intl.NumberFormat("ru-RU");
  const money = (n) => (GV.money ? GV.money(n) : nf.format(n || 0).replace(/\s/g, " ") + " ₽");
  const MON = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const MONF = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const dt = (iso) => { const x = new Date(iso); return isNaN(x) ? "" : String(x.getDate()).padStart(2, "0") + "." + String(x.getMonth() + 1).padStart(2, "0") + "." + x.getFullYear(); };
  const dShort = (iso) => { const x = new Date(iso); return isNaN(x) ? "" : x.getDate() + " " + MON[x.getMonth()]; };
  const dLong = (iso) => { const x = new Date(iso); return isNaN(x) ? "" : x.getDate() + " " + MONF[x.getMonth()]; };
  const tm = (iso) => { const x = new Date(iso); return isNaN(x) ? "" : String(x.getHours()).padStart(2, "0") + ":" + String(x.getMinutes()).padStart(2, "0"); };
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return n + " " + (m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c); };
  const typo = (t) => (GV.typo ? GV.typo(t) : t);
  const store = (kind) => ({
    get(k) { try { return JSON.parse(W[kind].getItem(k)); } catch (e) { return null; } },
    set(k, v) { if (isShot) return; try { W[kind].setItem(k, JSON.stringify(v)); } catch (e) { /* без хранилища — в памяти */ } },
    del(k) { try { W[kind].removeItem(k); } catch (e) { /* */ } }
  });
  const ss = store("sessionStorage"), ls = store("localStorage");
  const ARROW = '<svg class="gl" viewBox="0 0 16 12" aria-hidden="true" focusable="false"><path d="M0 6h14.5M9.5 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20.3s-7.3-4.5-9.4-9C1.1 8 2.9 4.3 6.5 4c2.1-.2 4 .9 5.5 3 1.5-2.1 3.4-3.2 5.5-3 3.6.3 5.4 4 3.9 7.3-2.1 4.5-9.4 9-9.4 9z"/></svg>';

  /* ---------- конфиг: ОДНА настройка adapter ---------- */
  const CFG = (function () {
    let c = { adapter: "demo", baseUrl: "", returnPath: "", policyUrl: "" };
    try { Object.assign(c, JSON.parse(($("#gv-account-config") || {}).textContent || "{}")); } catch (e) { /* битый JSON — демо */ }
    if (W.GV_ACCOUNT_CONFIG) Object.assign(c, W.GV_ACCOUNT_CONFIG);
    // переключение из адреса — только на локальной машине (иначе ссылкой можно увести данные на чужой сервер)
    const local = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost|.+\.test)$/.test(location.hostname);
    if (local && Q.get("lkadapter")) c.adapter = Q.get("lkadapter");
    if (local && Q.get("lkbase")) c.baseUrl = Q.get("lkbase");
    c.adapter = c.adapter === "api" && c.baseUrl ? "api" : "demo";
    c.baseUrl = String(c.baseUrl || "").replace(/\/+$/, "");
    return c;
  })();

  /* ---------- ошибки (problem+json, RFC 9457) ---------- */
  class LkError extends Error {
    constructor(status, data, retry) {
      super((data && data.title) || "Что-то сломалось. Попробуй ещё раз.");
      this.status = status; this.data = data || {}; this.code = this.data.code || (status === 0 ? "network" : "internal");
      this.retry = +(this.data.retry_after || retry || 0);
    }
  }
  function errText(e) {
    if (!e) return "";
    if (e.code === "network") return "Нет связи с сервером. Проверь интернет.";
    if (e.code === "rate_limited") return "Слишком часто. Подожди " + (e.retry ? plural(e.retry, "секунду", "секунды", "секунд") : "минуту") + ".";
    if (e.code === "invalid_code") return "Код не тот." + (e.data.attempts_left != null ? " Осталось попыток: " + e.data.attempts_left + "." : "");
    if (e.code === "challenge_expired") return "Код истёк. Запроси новый.";
    if (e.code === "captcha_required") return "Сервер просит капчу — во фронте её пока нет. Попробуй позже или другим способом.";
    if (e.code === "contact_taken") return "Этот контакт уже привязан к другому кабинету.";
    if (e.data.errors && e.data.errors.length) return e.data.errors.map((x) => x.message).join(" ");
    return e.message;
  }

  /* ---------- маршруты контракта A1 0.2.0-draft (operationId → метод + путь) ----------
     0.2: вход — телефон (звонок-сброс → SMS) + VK ID + Яндекс ID; почта и Telegram как вход выключены (149-ФЗ ч. 10 ст. 8),
     кнопки — строго по GET /auth/methods. Согласие на ПДн берём ПОСЛЕ кода / возврата с VK·Яндекс (409 consent_required / ?login=consent). */
  const ROUTES = {
    methods: ["GET", "/auth/methods"], session: ["GET", "/auth/session"],
    emailStart: ["POST", "/auth/email/start"], phoneStart: ["POST", "/auth/phone/start"], verify: ["POST", "/auth/verify"],
    vkStart: ["POST", "/auth/vkid/start"], yandexStart: ["POST", "/auth/yandex/start"], telegram: ["POST", "/auth/telegram"],
    logout: ["POST", "/auth/logout"], logoutAll: ["DELETE", "/me/sessions"],
    me: ["GET", "/me"], updateMe: ["PATCH", "/me"],
    contactStart: ["POST", "/me/contacts/start"], contactVerify: ["POST", "/me/contacts/verify"],
    tgLink: ["POST", "/me/telegram/link"], tgUnlink: ["DELETE", "/me/telegram/link"],
    addresses: ["GET", "/me/addresses"], addAddress: ["POST", "/me/addresses"],
    updateAddress: ["PATCH", "/me/addresses/{id}"], deleteAddress: ["DELETE", "/me/addresses/{id}"],
    pickupPoints: ["GET", "/delivery/pickup-points"],
    orders: ["GET", "/me/orders"], order: ["GET", "/me/orders/{id}"], pay: ["POST", "/me/orders/{id}/pay"],
    cart: ["GET", "/me/cart"], putCart: ["PUT", "/me/cart"], mergeCart: ["POST", "/me/cart/merge"],
    restock: ["GET", "/me/restock-subscriptions"], addRestock: ["POST", "/me/restock-subscriptions"],
    delRestock: ["DELETE", "/me/restock-subscriptions/{id}"],
    favs: ["GET", "/me/favorites"], addFavs: ["POST", "/me/favorites"], delFav: ["DELETE", "/me/favorites/{id}"],
    size: ["GET", "/me/size-profile"], putSize: ["PUT", "/me/size-profile"], delSize: ["DELETE", "/me/size-profile"],
    recommend: ["POST", "/size/recommend"],
    notif: ["GET", "/me/notification-settings"], putNotif: ["PUT", "/me/notification-settings"],
    docs: ["GET", "/consent-documents"], doc: ["GET", "/consent-documents/{type}/{version}"],
    consents: ["GET", "/me/consents"], grant: ["POST", "/me/consents"], withdraw: ["DELETE", "/me/consents/{type}"],
    exportReq: ["POST", "/me/data-export"], exportLatest: ["GET", "/me/data-export"],
    deletion: ["POST", "/me/deletion"], deletionStatus: ["GET", "/me/deletion"], cancelDeletion: ["DELETE", "/me/deletion"]
  };

  /* ---------- адаптер api ---------- */
  function ApiAdapter(base) {
    let csrf = null;
    async function call(name, params, bodyObj, retried) {
      const r0 = ROUTES[name];
      if (!r0) throw new LkError(0, { code: "internal", title: "Нет маршрута " + name });
      const m = r0[0];
      let path = r0[1].replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent((params || {})[k]));
      if (params && params.query) path += "?" + new URLSearchParams(params.query).toString();
      if (m !== "GET" && !csrf && name !== "session") await call("session");
      const h = { Accept: "application/json, application/problem+json" };
      if (m !== "GET") h["X-CSRF-Token"] = csrf || "";
      if (bodyObj !== undefined) h["Content-Type"] = "application/json";
      const ac = "AbortController" in W ? new AbortController() : null;
      const to = setTimeout(() => ac && ac.abort(), 15000);
      let res;
      try {
        res = await fetch(base + path, { method: m, credentials: "include", headers: h, cache: "no-store", mode: "cors",
          body: bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined, signal: ac ? ac.signal : undefined });
      } catch (e) { throw new LkError(0, null); } finally { clearTimeout(to); }
      let data = null;
      if (res.status !== 204) { try { data = await res.json(); } catch (e) { data = null; } }
      if (!res.ok) {
        const err = new LkError(res.status, data, res.headers.get("Retry-After"));
        // CSRF устарел (вход/выход в другой вкладке) — берём новый и повторяем один раз
        if (err.code === "csrf_failed" && !retried) { csrf = null; await call("session"); return call(name, params, bodyObj, true); }
        throw err;
      }
      if (data && data.csrf_token) csrf = data.csrf_token;
      return data;
    }
    return { name: "api", demo: false, call };
  }

  /* ---------- адаптер demo: в сеть НИЧЕГО не уходит ---------- */
  function DemoAdapter() {
    const KEY = "grinchin.lk.demo.v1";
    const VER = "2026-11-01.1-demo";
    const now = () => new Date().toISOString();
    const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
    const uid = (p) => p + "_" + Math.random().toString(36).slice(2, 8);
    let db = ss.get(KEY) || { authed: false, acc: null, guestCart: null };
    const save = () => ss.set(KEY, db);
    const chal = {};
    const fail = (status, code, title, extra) => { throw new LkError(status, Object.assign({ status, code, title }, extra || {})); };
    const DOCS = [
      { type: "pd_processing", version: VER, title: "Согласие на обработку персональных данных", short_label: "Даю согласие на обработку моих персональных данных на условиях [Согласия](#)",
        required_for: ["account", "checkout", "restock"], published_at: "2026-11-01T00:00:00Z", text_hash: "demo",
        body_md: "# Согласие на обработку персональных данных\n\n**Демо-пересказ.** Полный черновик — A1, `v4/lk/consents/pd_processing.md`, на проверке у юриста.\n\n## Кто обрабатывает\nОператор — {LEGAL_ENTITY}, бренд GRINCHIN.\n\n## Что обрабатываем\n- телефон (им входишь), имя, почта — если добавишь;\n- адреса доставки и пункты выдачи;\n- заказы, подписки «Разобрали — вернём», избранное, размерный профиль.\n\n## Зачем\nВести кабинет, оформлять и доставлять заказы, сообщать о статусе и о вернувшихся размерах.\n\n## Сколько храним\nПока есть кабинет. После удаления — только то, что требует закон (заказы и чеки).\n\n## Как отозвать\nВ кабинете: «Данные и согласия» → «Удалить кабинет». Или письмом оператору." },
      { type: "marketing", version: VER, title: "Согласие на рекламные рассылки", short_label: "Хочу получать новости о дропах и предложения GRINCHIN (можно отписаться в любой момент)",
        required_for: ["newsletter"], published_at: "2026-11-01T00:00:00Z", text_hash: "demo",
        body_md: "# Согласие на рекламные рассылки\n\n**Демо-пересказ.** Полный черновик — A1, `v4/lk/consents/marketing.md`.\n\nПишем о новых дропах, раннем доступе и перезапусках — не чаще раза в неделю, по каналам из настроек уведомлений.\n\nНеобязательно: без этого согласия кабинет и заказы работают так же.\n\nОтписаться — в любой момент: в кабинете («Уведомления» или «Данные и согласия») или по ссылке в каждом письме." }
    ];
    DOCS.push({ type: "privacy_policy", version: VER, title: "Политика обработки персональных данных", published_at: "2026-11-01T00:00:00Z",
      body_md: "# Политика обработки персональных данных\n\n**Демо-пересказ.** Полный черновик — A1, `v4/lk/consents/privacy_policy.md`; публикуется всегда, ссылка — у каждой формы и в подвале.\n\n## Коротко\n- кто оператор и как с ним связаться;\n- какие данные, зачем и сколько храним;\n- кому передаём (доставка, оплата, рассылки — по поручению);\n- данные хранятся в России;\n- как получить выгрузку, исправить или удалить данные." });
    const P = () => GV.byId || {};
    const lineOf = (id, size, qty) => { const p = P()[id] || { name: id, price: 0 }; return { product_id: id, name: p.name, size, qty, price: p.price, is_preorder: true }; };
    function newAccount(contact) {
      const u = { id: uid("usr"), display_name: contact.display_name || "", first_name: null, last_name: null,
        email: contact.email || null, email_verified: !!contact.email, phone: contact.phone || null, phone_verified: !!contact.phone,
        has_vk: !!contact.vk, has_yandex: !!contact.ya, has_telegram: !!contact.tg, created_at: now(),
        telegram: { linked: !!contact.tg, username: contact.tg || null, bot_started: !!contact.tg }, vk: { linked: !!contact.vk }, yandex: { linked: !!contact.ya } };
      const o1 = { id: "ord_demo1", number: "GV-0007", created_at: ago(30), status: "preorder_confirmed", status_label: "Предзаказ принят",
        is_preorder: true, ship_from: "2026-12-01", example: true,
        items: [lineOf("suit-detour", "L", 1), lineOf("tee-blank", "L", 1)], discount: 0, delivery_price: 450, refunded_amount: 0,
        delivery: { method: "cdek_pickup", address_text: "СДЭК, Москва, ул. Примерная, 1 (пример)", track_number: null, track_url: null, pickup_until: null },
        preorder: { ship_from: "2026-12-01", eta_text: "Отправим с 1 декабря", stage: "production" },
        timeline: [{ status: "pending_payment", label: "Создан", at: ago(30), note: null },
          { status: "preorder_confirmed", label: "Оплачен, предзаказ принят", at: ago(29.9), note: null },
          { status: "in_production", label: "Партия в работе", at: ago(6), note: "Шьём дроп 01" }],
        receipt_url: null, can_pay: false, can_cancel: false };
      const o2 = { id: "ord_demo2", number: "GV-0004", created_at: ago(80), status: "cancelled", status_label: "Отменён",
        is_preorder: true, ship_from: "2026-12-01", example: true, items: [lineOf("hoodie-crack", "M", 1)], discount: 0, delivery_price: 0, refunded_amount: 0,
        delivery: { method: "russianpost", address_text: "Почта России (пример)", track_number: null, track_url: null, pickup_until: null }, preorder: null,
        timeline: [{ status: "pending_payment", label: "Создан", at: ago(80), note: null },
          { status: "cancelled", label: "Отменён", at: ago(79.5), note: "Не оплачен за 30 минут" }],
        receipt_url: null, can_pay: false, can_cancel: false };
      [o1, o2].forEach((o) => { o.subtotal = o.items.reduce((a, i) => a + i.price * i.qty, 0); o.total = o.subtotal + o.delivery_price - o.discount; o.items_count = o.items.reduce((a, i) => a + i.qty, 0); });
      return { user: u, orders: [o1, o2], restock: [], favs: [], addresses: [], cart: [],
        size: { height_cm: null, weight_kg: null, chest_cm: null, waist_cm: null, hips_cm: null, inseam_cm: null, fit: null, usual_sizes: { top: null, bottom: null }, updated_at: null },
        notif: { channels: { email: { available: !!u.email, address: u.email }, telegram: { available: !!contact.tg }, sms: { available: !!u.phone } },
          categories: { order_status: [u.email ? "email" : contact.tg ? "telegram" : "sms"], restock: [u.email ? "email" : contact.tg ? "telegram" : "sms"], early_access: [], news: [] },
          quiet_hours: { from: "22:00", to: "09:00", tz: "Europe/Moscow" } },
        consents: { current: [
          { type: "pd_processing", status: "not_granted", version: null, granted_at: null, withdrawable: true, withdraw_effect: "Кабинет удалится; заказы и чеки храним по закону" },
          { type: "marketing", status: "not_granted", version: null, granted_at: null, withdrawable: true, withdraw_effect: null }], history: [] },
        exp: null, deletion: { status: "none", requested_at: null, purge_at: null }, linkedGuest: 1 };
    }
    function grant(acc, list, method) {
      (list || []).forEach((g) => {
        const c = acc.consents.current.filter((x) => x.type === g.type)[0];
        if (!c) return;
        Object.assign(c, { status: "granted", version: g.version || VER, granted_at: now(), withdrawn_at: null });
        acc.consents.history.unshift({ id: uid("cev"), type: g.type, action: "grant", version: g.version || VER, at: now(), method: g.method || method, channel: "web" });
      });
    }
    const pdOk = (acc) => acc.consents.current.some((c) => c.type === "pd_processing" && c.status === "granted");
    const brief = (u) => ({ id: u.id, display_name: u.display_name || "", email: u.email, email_verified: u.email_verified, phone: u.phone, phone_verified: u.phone_verified, has_vk: u.has_vk, has_yandex: u.has_yandex, has_telegram: u.has_telegram, created_at: u.created_at });
    const need = () => { if (!db.authed || !db.acc) fail(401, "unauthenticated", "Нужно войти"); return db.acc; };
    const mergeItems = (a, b) => {
      const m = {};
      a.concat(b).forEach((i) => { const k = i.product_id + "|" + i.size; m[k] = Math.max(m[k] || 0, i.qty); });
      const items = [], dropped = [];
      Object.keys(m).forEach((k) => {
        const [id, size] = k.split("|"), p = P()[id];
        if (!p) { dropped.push({ product_id: id, size, reason: "unknown_product" }); return; }
        const avail = Math.min(3, (p.sizes && p.sizes[size]) || 0);
        if (!avail) { dropped.push({ product_id: id, size, reason: "sold_out" }); return; }
        if (m[k] > avail) dropped.push({ product_id: id, size, reason: "limit" });
        items.push({ product_id: id, size, qty: Math.min(m[k], avail), name: p.name, price: p.price, available: avail, is_preorder: true });
      });
      return { items, dropped, total: items.reduce((s, i) => s + i.price * i.qty, 0), max_qty: 3, updated_at: now() };
    };
    const challenge = (channel, dest, len) => { const id = uid("chl"); chal[id] = { channel, dest, len, left: 5, at: Date.now() }; return { challenge_id: id, channel, destination_masked: dest.masked, code_length: len, expires_in: 600, resend_after: isShot ? 0 : 60, is_new_user: null }; };
    const maskMail = (e) => { const [a, b] = e.split("@"); return a.slice(0, 2) + "***@" + b; };
    const maskPhone = (p) => "+7 " + p.slice(2, 5) + " ***-**-" + p.slice(-2);
    function checkCode(id, code) {
      const c = chal[id];
      if (!c || Date.now() - c.at > 600e3 || c.left <= 0) fail(410, "challenge_expired", "Код истёк");
      if (code !== "123456".slice(0, c.len)) { c.left--; fail(c.left > 0 ? 401 : 410, c.left > 0 ? "invalid_code" : "challenge_expired", "Неверный код", { attempts_left: c.left }); }
      c.ok = true; // код верный: не сгорает до входа (409 consent_required → повтор с тем же кодом, как у A1)
      return c;
    }
    function login(contact, consents, guestCart) {
      let acc = db.acc, isNew = false;
      const same = acc && ((contact.email && acc.user.email === contact.email) || (contact.phone && acc.user.phone === contact.phone) || (contact.tg && acc.user.has_telegram));
      if (!same || !pdOk(acc)) {
        // новый покупатель: без согласия на ПДн кабинет не заводим (как 409 consent_required у A1)
        if (!(consents || []).some((g) => g.type === "pd_processing"))
          fail(409, "consent_required", "Нужно согласие", { required_consents: [{ type: "pd_processing", version: VER, required: true }, { type: "marketing", version: VER, required: false }] });
        if (!same) { acc = newAccount(contact); isNew = true; }
      }
      grant(acc, consents, "checkbox:lk_login");
      db.acc = acc; db.authed = true;
      const cart = mergeItems(acc.cart, guestCart || []);
      acc.cart = cart.items.map((i) => ({ product_id: i.product_id, size: i.size, qty: i.qty }));
      const linked = isNew ? acc.linkedGuest : 0;
      save();
      return { user: brief(acc.user), csrf_token: "demo", is_new_user: isNew, cart, linked_guest_orders: linked };
    }
    const delay = () => new Promise((r) => setTimeout(r, isShot ? 0 : 160 + Math.random() * 220));
    async function call(name, params, b) {
      await delay();
      params = params || {}; b = b || {};
      let acc;
      switch (name) {
        case "methods": { // как пример в api.yaml 0.2; ?lkmethods=all (только демо) — показать и выключенные экраны почты/Telegram
          const all = Q.get && Q.get("lkmethods") === "all";
          return { methods: [{ id: "phone_code", enabled: true, primary: true, channels: ["flash_call", "sms"] }, { id: "vk_id", enabled: true, primary: false },
            { id: "yandex_id", enabled: true, primary: false }, { id: "email_code", enabled: all, primary: false }, { id: "telegram", enabled: all, primary: false }] }; }
        case "session": return db.authed && db.acc ? { authenticated: true, csrf_token: "demo", user: brief(db.acc.user),
          required_consents: pdOk(db.acc) ? [] : [{ type: "pd_processing", version: VER, required: true }, { type: "marketing", version: VER, required: false }],
          deletion_scheduled_at: db.acc.deletion.status === "scheduled" ? db.acc.deletion.purge_at : null } : { authenticated: false, csrf_token: "demo", user: null, required_consents: [] };
        case "docs": return { items: DOCS.filter((x) => x.type !== "privacy_policy").map((x) => Object.assign({}, x, { body_md: undefined })) };
        case "doc": return DOCS.filter((x) => x.type === params.type)[0] || fail(404, "not_found", "Не найдено");
        case "emailStart":
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(b.email || "")) fail(400, "validation_error", "Проверь поля", { errors: [{ field: "email", message: "В почте опечатка?" }] });
          return challenge("email", { email: b.email.toLowerCase(), masked: maskMail(b.email) }, 6);
        case "phoneStart":
          if (!/^\+7\d{10}$/.test(b.phone || "")) fail(400, "validation_error", "Проверь поля", { errors: [{ field: "phone", message: "Номер — 10 цифр после +7." }] });
          return challenge(b.channel || "flash_call", { phone: b.phone, masked: maskPhone(b.phone) }, 4);
        case "verify": { const c = checkCode(b.challenge_id, b.code); const r = login(c.dest.email ? { email: c.dest.email, display_name: "" } : { phone: c.dest.phone }, b.consents, b.guest_cart); delete chal[b.challenge_id]; return r; }
        case "vkStart": case "yandexStart": return { authorize_url: "demo:" + name };
        case "oauthDemo": { // демо возврата с VK ID / Яндекс ID: сессия есть, согласия — следующим экраном (как ?login=consent)
          const kind = params.provider === "yandex" ? "ya" : "vk";
          let acc = db.acc;
          if (!acc || !(kind === "vk" ? acc.user.has_vk : acc.user.has_yandex)) { acc = newAccount({ [kind]: true, phone: "+79990000000", display_name: "" }); db.acc = acc; }
          db.authed = true;
          const cart = mergeItems(acc.cart, b.guest_cart || []); acc.cart = cart.items.map((i) => ({ product_id: i.product_id, size: i.size, qty: i.qty }));
          save(); return { user: brief(acc.user), csrf_token: "demo", is_new_user: !pdOk(acc), cart, linked_guest_orders: 0 }; }
        case "telegram": return login({ tg: "demo_user", display_name: "" }, b.consents, b.guest_cart);
        case "logout": db.authed = false; save(); return null;
        case "logoutAll": need(); return null;
        case "me": return need().user;
        case "updateMe": acc = need(); ["display_name", "first_name", "last_name"].forEach((k) => { if (k in b) acc.user[k] = b[k]; }); save(); return acc.user;
        case "contactStart": need();
          if (b.kind === "email") { if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(b.value || "")) fail(400, "validation_error", "Проверь поля", { errors: [{ field: "value", message: "В почте опечатка?" }] }); return challenge("email", { email: b.value.toLowerCase(), masked: maskMail(b.value) }, 6); }
          if (!/^\+7\d{10}$/.test(b.value || "")) fail(400, "validation_error", "Проверь поля", { errors: [{ field: "value", message: "Номер — 10 цифр после +7." }] });
          return challenge("sms", { phone: b.value, masked: maskPhone(b.value) }, 4);
        case "contactVerify": { acc = need(); const c = checkCode(b.challenge_id, b.code);
          delete chal[b.challenge_id];
          if (c.dest.email) { acc.user.email = c.dest.email; acc.user.email_verified = true; acc.notif.channels.email = { available: true, address: c.dest.email }; }
          else { acc.user.phone = c.dest.phone; acc.user.phone_verified = true; }
          save(); return acc.user; }
        case "tgLink": acc = need(); acc.user.telegram = { linked: true, username: "demo_user", bot_started: true }; acc.user.has_telegram = true; acc.notif.channels.telegram.available = true; save();
          return { url: "demo:telegram", expires_in: 900 };
        case "tgUnlink": acc = need(); acc.user.telegram = { linked: false, username: null, bot_started: false }; acc.user.has_telegram = false; acc.notif.channels.telegram.available = false;
          Object.keys(acc.notif.categories).forEach((k) => { acc.notif.categories[k] = acc.notif.categories[k].filter((c) => c !== "telegram"); }); save(); return null;
        case "addresses": return { items: need().addresses };
        case "addAddress": { acc = need(); if (acc.addresses.length >= 10) fail(422, "conflict", "Не больше 10 адресов");
          const a = Object.assign({ id: uid("adr"), created_at: now() }, b); if (a.is_default || !acc.addresses.length) { acc.addresses.forEach((x) => { x.is_default = false; }); a.is_default = true; }
          acc.addresses.push(a); save(); return a; }
        case "updateAddress": { acc = need(); const a = acc.addresses.filter((x) => x.id === params.id)[0] || fail(404, "not_found", "Не найдено");
          if (b.is_default) acc.addresses.forEach((x) => { x.is_default = false; }); Object.assign(a, b); save(); return a; }
        case "deleteAddress": acc = need(); { const was = acc.addresses.filter((x) => x.id === params.id)[0]; acc.addresses = acc.addresses.filter((x) => x.id !== params.id);
          if (was && was.is_default && acc.addresses[0]) acc.addresses[0].is_default = true; } save(); return null;
        case "pickupPoints": { const q = params.query || {}, city = (q.city || "Москва").trim() || "Москва";
          const prov = { cdek: "СДЭК", russianpost: "Почта России", yandex: "Яндекс Доставка", ozon: "Ozon" }[q.provider] || "СДЭК";
          return { items: [1, 2, 3].map((n) => ({ provider: q.provider, point_id: "DEMO-" + n, name: prov + " · пункт " + n + " (пример)", city,
            address: city + ", ул. Примерная, " + (n * 7), work_hours: n === 2 ? "круглосуточно" : "10–21", max_weight_kg: 15 })) }; }
        case "orders": return { items: need().orders.map((o) => ({ id: o.id, number: o.number, created_at: o.created_at, status: o.status, status_label: o.status_label, total: o.total,
          items_count: o.items_count, is_preorder: o.is_preorder, ship_from: o.ship_from, example: o.example, preview: o.items.map((i) => ({ product_id: i.product_id, size: i.size, qty: i.qty })) })), next_cursor: null };
        case "order": return need().orders.filter((o) => o.id === params.id)[0] || fail(404, "not_found", "Не найдено");
        case "pay": return { provider: "yookassa", payment_id: "demo", confirmation_url: "demo:pay", expires_at: now() };
        case "cart": return mergeItems(need().cart, []);
        case "putCart": { acc = need(); const c = mergeItems([], b.items || []); acc.cart = c.items.map((i) => ({ product_id: i.product_id, size: i.size, qty: i.qty })); save(); return c; }
        case "mergeCart": { acc = need(); const c = mergeItems(acc.cart, b.items || []); acc.cart = c.items.map((i) => ({ product_id: i.product_id, size: i.size, qty: i.qty })); save(); return c; }
        case "restock": return { items: need().restock };
        case "addRestock": { acc = need(); const out = [];
          (b.targets || []).forEach((t) => {
            let s = acc.restock.filter((x) => x.product_id === t.product_id && x.size === t.size && x.status !== "cancelled")[0];
            if (!s) { s = { id: uid("rs"), product_id: t.product_id, size: t.size, channels: b.channels || acc.notif.categories.restock.slice(), status: "active", created_at: now(), notified_at: null }; acc.restock.unshift(s); }
            out.push(s);
          }); save(); return { items: out }; }
        case "delRestock": acc = need(); acc.restock = acc.restock.filter((x) => x.id !== params.id); save(); return null;
        case "favs": return { items: need().favs };
        case "addFavs": acc = need(); (b.product_ids || []).forEach((id) => { if (!acc.favs.some((f) => f.product_id === id)) acc.favs.unshift({ product_id: id, size: null, added_at: now() }); }); save(); return { items: acc.favs };
        case "delFav": acc = need(); acc.favs = acc.favs.filter((f) => f.product_id !== params.id); save(); return null;
        case "size": return need().size;
        case "putSize": acc = need(); acc.size = Object.assign({}, b, { updated_at: now() }); save(); return acc.size;
        case "delSize": acc = need(); acc.size = { height_cm: null, weight_kg: null, chest_cm: null, waist_cm: null, hips_cm: null, inseam_cm: null, fit: null, usual_sizes: { top: null, bottom: null }, updated_at: null }; save(); return null;
        case "recommend": return localRecommend(b.params || (db.acc && db.acc.size) || {}, b.product_id);
        case "notif": return need().notif;
        case "putNotif": { acc = need();
          const mk = acc.consents.current.filter((c) => c.type === "marketing")[0];
          if (((b.categories.early_access || []).length || (b.categories.news || []).length) && mk.status !== "granted")
            fail(409, "consent_required", "Нужно согласие", { required_consents: [{ type: "marketing", version: VER, required: true }] });
          acc.notif = JSON.parse(JSON.stringify(b)); save(); return acc.notif; }
        case "consents": return need().consents;
        case "grant": acc = need(); grant(acc, b.consents, "checkbox:lk_settings"); save(); return acc.consents;
        case "withdraw": { acc = need(); const c = acc.consents.current.filter((x) => x.type === params.type)[0] || fail(404, "not_found", "Не найдено");
          c.status = "withdrawn"; c.withdrawn_at = now();
          acc.consents.history.unshift({ id: uid("cev"), type: c.type, action: "withdraw", version: c.version, at: now(), method: "button:lk_privacy", channel: "web" });
          if (c.type === "marketing") { acc.notif.categories.early_access = []; acc.notif.categories.news = []; }
          save(); return c; }
        case "exportReq": acc = need(); acc.exp = { id: uid("exp"), status: "ready", requested_at: now(), ready_at: now(), download_url: "demo:export", expires_at: new Date(Date.now() + 72 * 3600e3).toISOString(), format: "zip" }; save(); return acc.exp;
        case "exportLatest": return need().exp || { id: null, status: "none", requested_at: null };
        case "deletion": { acc = need();
          if (!b.challenge_id) { const u = acc.user; return u.phone || !u.email ? challenge("flash_call", { phone: u.phone || "+70000000000", masked: maskPhone(u.phone || "+70000000000") }, 4) : challenge("email", { email: u.email, masked: maskMail(u.email) }, 6); } // основной контакт — телефон (0.2)
          checkCode(b.challenge_id, b.code); delete chal[b.challenge_id];
          acc.deletion = { status: "scheduled", requested_at: now(), purge_at: new Date(Date.now() + 7 * 86400e3).toISOString(), retained: RETAINED };
          db.authed = false; save(); return acc.deletion; }
        case "deletionStatus": return Object.assign({ retained: RETAINED }, need().deletion);
        case "cancelDeletion": acc = need(); acc.deletion = { status: "none", requested_at: null, purge_at: null }; save(); return null;
        default: fail(404, "not_found", "Нет такого метода в демо: " + name);
      }
    }
    // выгрузка в демо — файл собирается прямо в браузере из того, что лежит во вкладке
    function exportBlob() {
      const a = db.acc; if (!a) return null;
      const out = { note: "GRINCHIN — демо-выгрузка кабинета. Данные жили только в этой вкладке браузера.", generated_at: now(),
        profile: a.user, addresses: a.addresses, orders: a.orders, restock_subscriptions: a.restock, favorites: a.favs, size_profile: a.size,
        notification_settings: a.notif, consents: a.consents, cart: a.cart };
      return new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    }
    function seed() { // ?lkdemo=1 — сразу вошедший покупатель с примерами (для кадров)
      if (db.acc && db.authed) return;
      const acc = newAccount({ phone: "+79991234567", email: "demo@example.ru", display_name: "Петя" });
      grant(acc, [{ type: "pd_processing", version: VER }], "checkbox:lk_login");
      acc.favs = [{ product_id: "hoodie-crack", size: null, added_at: now() }, { product_id: "jeans-scribble", size: null, added_at: now() }];
      const so = (GV.products || []).filter((p) => p.state === "soldout")[0];
      acc.restock = [{ id: uid("rs"), product_id: "jeans-restart", size: "L", channels: ["email"], status: "active", created_at: ago(20), notified_at: null }];
      if (so) acc.restock.push({ id: uid("rs"), product_id: so.id, size: "*", channels: ["email"], status: "active", created_at: ago(40), notified_at: null });
      acc.addresses = [{ id: uid("adr"), kind: "pickup", is_default: true, label: "ПВЗ у дома", recipient: { name: "Пётр", phone: "+79990000000" },
        pickup: { provider: "cdek", point_id: "DEMO-1", name: "СДЭК · пункт 1 (пример)", city: "Москва", address: "Москва, ул. Примерная, 7", work_hours: "10–21" }, courier: null, created_at: now() }];
      acc.size = Object.assign(acc.size, { height_cm: 182, chest_cm: 102, fit: "oversize", usual_sizes: { top: "L", bottom: "L" }, updated_at: now() });
      db.acc = acc; db.authed = true; save();
    }
    return { name: "demo", demo: true, call, exportBlob, seed };
  }

  /* ---------- размер по сетке дропа (демо и запасной расчёт без сервера) ---------- */
  const GRID = [["S", 88, 94], ["M", 94, 100], ["L", 100, 106], ["XL", 106, 112], ["XXL", 112, 118]]; // = таблица «Размерная сетка» (index.html)
  const RETAINED = [{ what: "Заказы и чеки", basis: "Бухучёт (402-ФЗ ст. 29) — 5 лет", until: null }, { what: "Журнал согласий", basis: "Доказательство согласия (152-ФЗ ст. 9 ч. 3)", until: null }];
  function localRecommend(sp, pid) {
    const chest = +sp.chest_cm || 0, top = sp.usual_sizes && sp.usual_sizes.top;
    let size = null, conf = "low", reason = "";
    if (chest) {
      const hit = GRID.filter((g) => chest >= g[1] && chest < g[2])[0] || (chest < 88 ? GRID[0] : chest >= 118 ? GRID[4] : null);
      if (hit) { size = hit[0]; conf = chest < 88 || chest >= 118 ? "medium" : "high"; reason = "Грудь " + chest + " см → " + size + " по сетке дропа"; }
    } else if (top && GRID.some((g) => g[0] === top)) { size = top; conf = "medium"; reason = "Обычно носишь " + top; }
    if (size && sp.fit === "slim") { const i = GRID.findIndex((g) => g[0] === size); if (i > 0) { reason += "; крой свободный — для посадки по фигуре " + GRID[i - 1][0]; } }
    const p = (GV.byId || {})[pid];
    return { product_id: pid || null, size, confidence: conf, reason: reason || "Мало данных: нужна грудь или обычный размер.",
      alternative: size && size !== "XXL" ? { size: GRID[GRID.findIndex((g) => g[0] === size) + 1][0], when: "если любишь совсем свободно" } : null,
      in_stock: !!(p && size && p.sizes[size] > 0), missing_params: chest ? [] : ["chest_cm"] };
  }

  const A = CFG.adapter === "api" ? ApiAdapter(CFG.baseUrl) : DemoAdapter();
  if (A.demo && Q.get("lkdemo") === "1") A.seed();

  /* ---------- состояние ---------- */
  const S = {
    session: null, user: null, methods: null, docs: null,
    screen: null, arg: null, hist: [], flow: {}, busy: false, err: "",
    c: {}, // кэш данных экранов
    guest: { favs: (A.demo ? ss : ls).get("grinchin.fav.v1") || [], restock: (A.demo ? ss : ls).get("grinchin.restock.v1") || [] }
  };
  const authed = () => !!(S.session && S.session.authenticated);
  const P = () => GV.byId || {};
  const prod = (id) => P()[id] || null;
  const pname = (id) => (prod(id) ? prod(id).name : id);
  const anyStock = (p) => p && p.state !== "soldout" && Object.keys(p.sizes).some((s) => p.sizes[s] > 0);
  const saveGuest = () => { const st = A.demo ? ss : ls; st.set("grinchin.fav.v1", S.guest.favs); st.set("grinchin.restock.v1", S.guest.restock); };

  /* ---------- избранное ---------- */
  function favSet() { return authed() ? (S.c.favs || []).map((f) => f.product_id) : S.guest.favs; }
  function favHas(id) { return favSet().indexOf(id) > -1; }
  async function favToggle(id, btn) {
    const on = !favHas(id);
    if (!authed()) {
      S.guest.favs = on ? [id].concat(S.guest.favs.filter((x) => x !== id)) : S.guest.favs.filter((x) => x !== id);
      saveGuest(); paintHearts();
      toast(on ? "В избранном. Войди — сохраним в кабинете." : "Убрали из избранного.");
      return;
    }
    // оптимистично: сердце красим сразу, при ошибке — откат
    const before = (S.c.favs || []).slice();
    S.c.favs = on ? [{ product_id: id, size: null, added_at: new Date().toISOString() }].concat(before) : before.filter((f) => f.product_id !== id);
    paintHearts();
    try {
      if (on) await A.call("addFavs", null, { product_ids: [id] }); else await A.call("delFav", { id });
      toast(on ? "В избранном." : "Убрали из избранного.");
    } catch (e) { S.c.favs = before; paintHearts(); toast(errText(e)); }
    if (isOpenLK() && S.screen === "favs") render();
    if (btn && d.contains(btn)) btn.focus({ preventScroll: true });
  }
  function heartHTML(id, cls) {
    const on = favHas(id);
    return '<button type="button" class="ac-heart ' + (cls || "") + '" data-ac-fav="' + esc(id) + '" aria-pressed="' + on + '" aria-label="' +
      (on ? "Убрать из избранного: " : "В избранное: ") + esc(pname(id)) + '">' + HEART + "</button>";
  }
  function paintHearts() {
    $$("[data-ac-fav]").forEach((b) => {
      const on = favHas(b.dataset.acFav);
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", (on ? "Убрать из избранного: " : "В избранное: ") + pname(b.dataset.acFav));
    });
  }

  /* ---------- «Разобрали — вернём» ---------- */
  function markSubs(list) { // карточка товара (shop.js) показывает «Подписан ✓» по p.subs
    (list || []).forEach((s) => { const p = prod(s.product_id); if (p && s.status !== "cancelled") (p.subs = p.subs || {})[s.size] = 1; });
  }
  async function restockAdd(targets, quiet) {
    targets = (targets || []).filter((t) => t && prod(t.product_id));
    if (!targets.length) return;
    if (!authed()) {
      targets.forEach((t) => { if (!S.guest.restock.some((x) => x.product_id === t.product_id && x.size === t.size)) S.guest.restock.push({ product_id: t.product_id, size: t.size }); });
      saveGuest();
      return;
    }
    try {
      const r = await A.call("addRestock", null, { targets });
      S.c.restock = null; markSubs(r && r.items);
      if (!quiet) toast("Сохранили в кабинете: «Разобрали — вернём».");
    } catch (e) { toast(errText(e)); }
  }

  /* ---------- корзина: гостевая → аккаунт ---------- */
  let applyingCart = false, cartT = 0;
  const cartItems = () => (GV.cart ? GV.cart.items : []).map((i) => ({ product_id: i.id, size: i.size, qty: i.qty }));
  function replaceCart(items) {
    if (!GV.cart) return;
    const want = (items || []).map((i) => ({ id: i.product_id, size: i.size, qty: i.qty }));
    const same = JSON.stringify(GV.cart.items.map((i) => [i.id, i.size, i.qty]).sort()) === JSON.stringify(want.map((i) => [i.id, i.size, i.qty]).sort());
    if (same) return;
    applyingCart = true;
    if (typeof GV.cart.replace === "function") { try { GV.cart.replace(want); } finally { applyingCart = false; } return; }
    // shop.js (V2) пока не умеет replace: собираем через clear/add, глуша тосты и реакцию маскота на grinchin:add
    const t = GV.toast, stop = (e) => e.stopImmediatePropagation();
    GV.toast = function () {}; W.addEventListener("grinchin:add", stop, true);
    try {
      GV.cart.clear();
      want.forEach((i) => { for (let k = 0; k < i.qty; k++) GV.cart.add(i.id, i.size); });
    } finally { GV.toast = t; W.removeEventListener("grinchin:add", stop, true); applyingCart = false; }
  }
  d.addEventListener("grinchin:cart", () => {
    if (applyingCart || !authed()) return;
    clearTimeout(cartT);
    cartT = setTimeout(() => { A.call("putCart", null, { items: cartItems() }).catch(() => { /* корзина на устройстве цела; повторим на следующем изменении */ }); }, 800);
  });

  /* ---------- сессия ---------- */
  async function loadSession() {
    try { S.session = await A.call("session"); } catch (e) { S.session = { authenticated: false, user: null }; }
    S.user = S.session.user || null;
    if (authed()) {
      try { const f = await A.call("favs"); S.c.favs = f.items || []; } catch (e) { S.c.favs = []; }
      try { const r = await A.call("restock"); S.c.restock = r.items || []; markSubs(S.c.restock); } catch (e) { /* */ }
    }
    paintHeader(); paintHearts();
    emit("grinchin:account", { authenticated: authed(), user: S.user });
  }
  const needsConsent = () => authed() && ((S.session.required_consents || []).some((c) => c.required));
  // вход состоялся (код / VK ID / Яндекс ID). Если сервер ждёт согласие — сначала экран согласий, перенос корзины и прочего — после
  async function afterLogin(r) {
    S.c = {}; S.pendingLogin = r || {};
    await loadSession();
    if (needsConsent()) { go("consent", null, true); return; }
    await finishLogin();
  }
  async function finishLogin() {
    const r = S.pendingLogin || {}; S.pendingLogin = null; S.flow = {};
    const notes = [];
    let cart = r.cart;
    // OAuth (VK/Яндекс) возвращается редиректом без guest_cart — сливаем отдельным запросом
    if (!cart && cartItems().length) { try { cart = await A.call("mergeCart", null, { items: cartItems() }); } catch (e) { cart = null; } }
    if (!cart && !cartItems().length) { try { cart = await A.call("cart"); } catch (e) { cart = null; } }
    if (cart) {
      replaceCart(cart.items);
      if (cart.items.length) notes.push("корзина — в кабинете (" + plural(cart.items.reduce((a, i) => a + i.qty, 0), "вещь", "вещи", "вещей") + ")");
      if (cart.dropped && cart.dropped.length) notes.push(plural(cart.dropped.length, "позиция", "позиции", "позиций") + " уже разобрали");
    }
    if (S.guest.favs.length) {
      try { await A.call("addFavs", null, { product_ids: S.guest.favs }); notes.push("избранное перенесли"); } catch (e) { /* */ }
      S.guest.favs = [];
    }
    if (S.guest.restock.length) {
      try { await A.call("addRestock", null, { targets: S.guest.restock }); notes.push("подписки перенесли"); } catch (e) { /* */ }
      S.guest.restock = [];
    }
    saveGuest();
    await loadSession();
    if (r.linked_guest_orders) notes.push("нашли " + plural(r.linked_guest_orders, "заказ", "заказа", "заказов") + " без входа");
    go("home", null, true);
    toast((r.is_new_user ? "Кабинет готов" : "Ты в кабинете") + (notes.length ? ": " + notes.join(", ") + "." : "."), 3600);
  }
  async function doLogout(all) {
    try { if (all) await A.call("logoutAll"); await A.call("logout"); } catch (e) { /* сессию на устройстве всё равно гасим */ }
    S.session = { authenticated: false, user: null }; S.user = null; S.c = {}; S.flow = {};
    (GV.products || []).forEach((p) => { delete p.subs; }); // подписки кабинета — не на этом устройстве
    replaceCart([]); // корзина принадлежала кабинету — на общем устройстве не оставляем
    paintHeader(); paintHearts();
    emit("grinchin:account", { authenticated: false, user: null });
  }

  /* ---------- шапка и меню ---------- */
  function initial() { const n = (S.user && (S.user.display_name || S.user.email || S.user.phone || "")) || ""; return (n.replace(/^[+@\d\s]+/, "").charAt(0) || "G").toUpperCase(); }
  function displayName() { return (S.user && S.user.display_name) || ""; }
  function paintHeader() {
    $$(".hd-acc").forEach((b) => {
      b.dataset.authed = authed() ? "1" : "0";
      b.setAttribute("aria-label", authed() ? "Кабинет" + (displayName() ? ": " + displayName() : "") : "Войти в кабинет");
      const i = $(".hd-acc-i", b); if (i) i.textContent = authed() ? initial() : "";
    });
    $$("[data-ac-menu]").forEach((m) => { m.textContent = authed() ? "Кабинет" + (displayName() ? " · " + displayName() : "") : "Вход в кабинет"; });
  }

  /* ---------- оверлей (вне стека shop.js: он не знает «account»; оборачиваем его API) ---------- */
  let openFlag = false, opener = null, inerted = [], lockY = 0, hideT = 0, resendT = 0;
  const isOpenLK = () => openFlag;
  function lock(on) {
    if (on) {
      if (root.classList.contains("is-locked")) return;
      lockY = W.scrollY; root.style.setProperty("--sbw", (W.innerWidth - root.clientWidth) + "px"); root.classList.add("is-locked");
    } else {
      root.classList.remove("is-locked"); root.style.removeProperty("--sbw");
      if (Math.abs(W.scrollY - lockY) > 1) W.scrollTo(0, lockY);
    }
  }
  function openLK(screen, arg) {
    if (GV.overlay && GV.overlay !== "account" && _closeAll) _closeAll.call(GV);
    const target = screen || (authed() ? "home" : "login");
    if (openFlag) { go(target, arg, true); return true; }
    const a = d.activeElement;
    opener = a && a !== d.body && !a.closest(".ov") ? a : $(".hd-acc");
    clearTimeout(hideT);
    openFlag = true;
    ov.hidden = false;
    ov.style.zIndex = "84";
    root.dataset.overlay = "account";
    lock(true);
    inerted = $$("body > :not(#account-sheet):not(script):not(template):not(#toast):not(#loader)").filter((el) => !el.inert);
    inerted.forEach((el) => { el.inert = true; });
    panel.classList.remove("is-dragging", "is-closing"); panel.style.transform = "";
    if (instant()) ov.classList.add("is-open"); else { void ov.offsetWidth; requestAnimationFrame(() => ov.classList.add("is-open")); }
    S.hist = [];
    go(target, arg, true);
    panel.focus({ preventScroll: true });
    emit("grinchin:overlay", { name: "account", open: true });
    return true;
  }
  function closeLK(restore) {
    if (!openFlag) return;
    openFlag = false;
    clearInterval(resendT);
    ov.classList.remove("is-open");
    const done = () => { if (!openFlag) { ov.hidden = true; panel.classList.remove("is-dragging", "is-closing"); panel.style.transform = ""; destroyMascots(); } };
    if (instant()) done(); else hideT = setTimeout(done, 440);
    inerted.forEach((el) => { el.inert = false; }); inerted = [];
    if (root.dataset.overlay === "account") delete root.dataset.overlay;
    lock(false);
    try { if (Q.get && Q.get("lk")) { const u = new URL(location.href); u.searchParams.delete("lk"); u.searchParams.delete("login"); history.replaceState(history.state, "", u.pathname + u.search + u.hash); } } catch (e) { /* file:// */ }
    if (restore !== false && opener && d.contains(opener) && !opener.closest("[inert]")) opener.focus({ preventScroll: true });
    emit("grinchin:overlay", { name: "account", open: false });
  }
  const _open = GV.open, _close = GV.close, _closeAll = GV.closeAll, _nav = GV.navigate;
  GV.open = function (name, arg) {
    if (name === "account") return openLK(arg);
    if (openFlag) closeLK(false);
    if (name === "product") curProduct = arg;
    return _open ? _open.apply(this, arguments) : false;
  };
  GV.close = function () { if (openFlag) return closeLK(true); return _close && _close.apply(this, arguments); };
  GV.closeAll = function () { if (openFlag) closeLK(false); return _closeAll && _closeAll.apply(this, arguments); };
  GV.navigate = function (target, o) {
    if (!openFlag) return _nav && _nav.apply(this, arguments);
    closeLK(false);
    const args = arguments, self = this;
    setTimeout(() => _nav && _nav.apply(self, args), instant() ? 0 : 60);
  };
  try {
    const desc = Object.getOwnPropertyDescriptor(GV, "overlay"), get0 = desc && desc.get;
    Object.defineProperty(GV, "overlay", { get() { return openFlag ? "account" : get0 ? get0.call(GV) : null; }, configurable: true });
  } catch (e) { /* */ }

  d.addEventListener("keydown", (e) => {
    if (!openFlag) return;
    if (e.key === "Escape") { e.preventDefault(); closeLK(true); return; }
    if (e.key !== "Tab") return;
    const f = $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])', ov)
      .filter((x) => x.getClientRects().length && !x.closest("[hidden]"));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1], a = d.activeElement;
    if (f.indexOf(a) < 0) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  });

  // свайп вниз по шапке шита (телефон): только transform
  (function swipe() {
    const bar = $("[data-ac-grab]", ov);
    let y0 = 0, dy = 0, t0 = 0, on = false;
    bar.addEventListener("touchstart", (e) => { if (W.innerWidth >= 768 || e.target.closest("button")) return; on = true; y0 = e.touches[0].clientY; dy = 0; t0 = Date.now(); panel.classList.add("is-dragging"); }, { passive: true });
    bar.addEventListener("touchmove", (e) => { if (!on) return; dy = Math.max(0, e.touches[0].clientY - y0); panel.style.transform = "translateY(" + dy + "px)"; }, { passive: true });
    const end = () => {
      if (!on) return; on = false; panel.classList.remove("is-dragging");
      const v = dy / Math.max(1, Date.now() - t0);
      if (dy > 120 || (dy > 40 && v > 0.6)) { panel.classList.add("is-closing"); panel.style.transform = "translateY(100%)"; closeLK(true); }
      else { panel.classList.add("is-spring"); panel.style.transform = ""; setTimeout(() => panel.classList.remove("is-spring"), 500); }
    };
    bar.addEventListener("touchend", end, { passive: true }); bar.addEventListener("touchcancel", end, { passive: true });
  })();

  /* ---------- маскот (V3): только на входе и в пустых состояниях ---------- */
  function mascotHTML(pose, cls) { return '<div class="ac-mz ' + (cls || "") + '" data-ac-mz="' + pose + '" aria-hidden="true"></div>'; }
  function mountMascots() {
    $$("[data-ac-mz]", body).forEach((el) => {
      if (el.children.length || !GV.mascot || typeof GV.mascot.mount !== "function") return;
      try { GV.mascot.mount(el, { pose: el.dataset.acMz }); } catch (e) { /* украшение */ }
    });
  }
  function destroyMascots() { $$("[data-ac-mz]", body).forEach((el) => { try { if (el.__mz && el.__mz.destroy) el.__mz.destroy(); } catch (e) { /* */ } }); }

  /* ---------- экраны ---------- */
  const NAV = [
    ["orders", "Заказы"], ["restock", "Разобрали — вернём"], ["favs", "Избранное"], ["profile", "Профиль"],
    ["sizes", "Размеры"], ["addresses", "Адреса и ПВЗ"], ["notify", "Уведомления"], ["privacy", "Данные и согласия"]
  ];
  const TITLES = { login: "Вход", email: "Вход по почте", phone: "Вход по телефону", tg: "Telegram", code: "Код",
    consent: "Согласие", home: "Кабинет", order: "Заказ", contact: "Контакт", address: "Адрес", doc: "Документ", del: "Удалить кабинет", bye: "Кабинет" };
  NAV.forEach((n) => { TITLES[n[0]] = n[1]; });
  const GUEST = { login: 1, email: 1, phone: 1, tg: 1, code: 1, consent: 1, doc: 1, bye: 1 };
  const LOAD = { home: ["orders", "active"], orders: ["orders"], order: ["order"], restock: ["restock"], favs: ["favs"], profile: ["me"], sizes: ["size"],
    addresses: ["addresses"], address: ["addresses"], notify: ["notif", "consents", "me", "docs"], privacy: ["consents", "exp", "docs"], del: ["deletion"], doc: ["doc"],
    login: ["methods"], consent: ["docs"] };

  async function need(key) {
    const c = S.c;
    switch (key) {
      case "methods": if (!S.methods) S.methods = (await A.call("methods")).methods || []; return;
      case "docs": if (!S.docs) { const r = await A.call("docs"); S.docs = {}; (r.items || []).forEach((x) => { S.docs[x.type] = x; }); } return;
      case "doc": { const t = S.arg && S.arg.type; if (!c["doc:" + t]) c["doc:" + t] = await A.call("doc", { type: t, version: "current" }); return; }
      case "orders": if (!c.orders) c.orders = (await A.call("orders")).items || []; return;
      case "active": { const o = activeOrder(); if (o && !c["order:" + o.id]) c["order:" + o.id] = await A.call("order", { id: o.id }); return; } // стадия предзаказа есть только в деталях
      case "order": if (!c["order:" + S.arg]) c["order:" + S.arg] = await A.call("order", { id: S.arg }); return;
      case "restock": if (!c.restock) { c.restock = (await A.call("restock")).items || []; markSubs(c.restock); } return;
      case "favs": if (!c.favs) c.favs = (await A.call("favs")).items || []; return;
      case "me": if (!c.me) c.me = await A.call("me"); return;
      case "size": if (!c.size) c.size = await A.call("size"); return;
      case "addresses": if (!c.addresses) c.addresses = (await A.call("addresses")).items || []; return;
      case "notif": if (!c.notif) c.notif = await A.call("notif"); return;
      case "consents": if (!c.consents) c.consents = await A.call("consents"); return;
      case "exp": if (!c.exp) c.exp = await A.call("exportLatest").catch(() => ({ status: "none" })); return;
      case "deletion": if (!c.deletion) c.deletion = await A.call("deletionStatus").catch(() => ({ status: "none", retained: RETAINED })); return;
    }
  }
  let seq = 0;
  async function go(screen, arg, replace) {
    if (!GUEST[screen] && !authed()) { screen = "login"; arg = null; }
    if (authed() && (screen === "login" || screen === "email" || screen === "phone")) screen = "home";
    if (needsConsent() && screen !== "doc" && screen !== "bye") screen = "consent"; // без согласия на ПДн кабинет не показываем
    if (!replace && S.screen && S.screen !== screen) S.hist.push([S.screen, S.arg]);
    if (replace) S.hist = screen === "home" || screen === "login" ? [] : S.hist;
    S.screen = screen; S.arg = arg == null ? null : arg; S.err = "";
    clearInterval(resendT);
    const my = ++seq;
    const keys = LOAD[screen] || [];
    const missing = keys.some((k) => !have(k));
    if (missing) { render(true); }
    try { for (const k of keys) await need(k); }
    catch (e) {
      if (e.code === "unauthenticated") { await loadSession(); if (my === seq) go("login", null, true); return; }
      S.err = errText(e);
    }
    if (my !== seq) return;
    render();
  }
  function have(k) {
    if (k === "methods") return !!S.methods; if (k === "docs") return !!S.docs;
    if (k === "doc") return !!S.c["doc:" + (S.arg && S.arg.type)];
    if (k === "order") return !!S.c["order:" + S.arg];
    if (k === "active") { const o = S.c.orders && activeOrder(); return !!S.c.orders && (!o || !!S.c["order:" + o.id]); }
    return !!S.c[k];
  }
  function back() {
    const h = S.hist.pop();
    if (h) { S.screen = null; go(h[0], h[1], true); S.hist = S.hist; } else closeLK(true);
  }

  /* ---------- куски разметки ---------- */
  const row = (go_, label, val, extra) => '<button type="button" class="ac-row" data-ac-go="' + go_ + '"' + (extra || "") + '><span class="ac-row-l">' + label +
    '</span><span class="ac-row-v">' + (val == null ? "" : val) + '</span><span class="ac-row-go" aria-hidden="true">' + ARROW + "</span></button>";
  const thumb = (id, cls) => {
    const p = prod(id), ph = GV.photos && GV.photos.of(id);
    if (ph && ph.front && GV.photos.picture) return '<span class="ac-thumb ' + (cls || "") + '">' + GV.photos.picture(ph.front, "96px", "", "", true) + "</span>";
    return '<span class="ac-thumb ' + (cls || "") + '">' + (p && p.img ? '<img src="' + p.img[0] + '" alt="" width="800" height="1000" loading="lazy" decoding="async">' : "") + "</span>";
  };
  const field = (id, label, input, hint, errId) => '<div class="ac-field"><label class="ac-fl" for="' + id + '"><span class="ac-k">' + label + "</span>" + input + "</label>" +
    (hint ? '<p class="ac-hint" id="' + id + '-h">' + hint + "</p>" : "") + (errId ? '<p class="field-err" id="' + errId + '" aria-live="polite"></p>' : "") + "</div>";
  const check = (name, label, checked, extra) => '<label class="ac-check"><input type="checkbox" name="' + name + '"' + (checked ? " checked" : "") + (extra || "") + '><span class="ac-check-t">' + label + "</span></label>";
  const errP = (id) => '<p class="field-err" id="' + id + '" data-ac-err aria-live="polite">' + esc(S.err || "") + "</p>";
  const STATUS = {
    pending_payment: ["Ждёт оплаты", "wait"], paid: ["Оплачен", "ok"], preorder_confirmed: ["Предзаказ принят", "ok"], in_production: ["Шьём", "ok"],
    ready_to_ship: ["Собран", "ok"], shipped: ["В пути", "go"], at_pickup_point: ["Ждёт в пункте", "go"], delivered: ["Получен", "done"],
    cancelled: ["Отменён", "off"], refund_pending: ["Возврат в работе", "wait"], refunded: ["Возвращён", "off"], partially_refunded: ["Частичный возврат", "off"]
  };
  const chip = (st, label) => { const s = STATUS[st] || [label || st, "ok"]; return '<span class="ac-chip ac-chip--' + s[1] + '">' + esc(label || s[0]) + "</span>"; };
  const FINAL = { delivered: 1, cancelled: 1, refunded: 1, partially_refunded: 1 };
  // путь предзаказа: стадии A1 (preorder.stage) + отправка/получение
  const STAGES = [["collecting", "Собираем предзаказ"], ["production", "Шьём"], ["quality_check", "Проверяем"], ["packing", "Пакуем"], ["shipped", "Отправили"], ["delivered", "У тебя"]];
  function stageIndex(o) {
    if (o.status === "delivered") return 5;
    if (o.status === "shipped" || o.status === "at_pickup_point") return 4;
    if (o.status === "ready_to_ship") return 3;
    const st = o.preorder && o.preorder.stage;
    const i = STAGES.findIndex((s) => s[0] === st);
    if (i > -1) return i;
    return o.status === "in_production" ? 1 : 0;
  }
  function stepper(o, compact) {
    const k = stageIndex(o);
    return '<ol class="ac-steps' + (compact ? " ac-steps--c" : "") + '" aria-label="Путь заказа">' + STAGES.map((s, i) =>
      '<li class="' + (i < k ? "is-done" : i === k ? "is-now" : "") + '"' + (i === k ? ' aria-current="step"' : "") + '><span class="ac-step-d" aria-hidden="true"></span><span class="ac-step-t">' + s[1] + "</span></li>").join("") + "</ol>";
  }

  /* ---------- экраны: гость ---------- */
  const METHOD = { // [экран | act, имя, подпись, «почему выключено»]
    phone_code: ["phone", "Телефон", "позвоним — код в номере", ""], vk_id: ["oauth:vk", "VK ID", "одной кнопкой", ""],
    yandex_id: ["oauth:yandex", "Яндекс ID", "одной кнопкой", ""], email_code: ["email", "Почта", "код письмом", "после юриста"],
    telegram: ["tg", "Telegram", "подтвердишь в боте", "только уведомления"]
  };
  const policyLink = () => '<button type="button" class="ac-a" data-ac-doc="privacy_policy">Политика обработки персональных данных</button>';
  function scrLogin() {
    const ms = (S.methods || []).filter((m) => METHOD[m.id]);
    const on = ms.filter((m) => m.enabled).sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));
    const off = ms.filter((m) => !m.enabled);
    const btn = (m, i) => {
      const M = METHOD[m.id], oa = M[0].indexOf("oauth:") === 0;
      return '<button type="button" role="listitem" class="ac-method' + (i === 0 ? " is-primary" : "") + '" ' + (oa ? 'data-ac-act="oauth" data-ac-arg="' + M[0].slice(6) + '"' : 'data-ac-go="' + M[0] + '"') + ">" +
        '<span class="ac-method-n">' + M[1] + '</span><span class="ac-method-s">' + M[2] + '</span><span class="ac-row-go" aria-hidden="true">' + ARROW + "</span></button>";
    };
    return '<div class="ac-hello ac-hello--guest">' +
      '<div class="ac-hello-c"><p class="ac-big">Свой кабинет.</p><p class="ac-lead">Заказы и&nbsp;путь предзаказа, «Разобрали&nbsp;— вернём» по&nbsp;размеру, избранное, адреса.</p></div>' +
      mascotHTML("subscribe", "ac-mz--login") + "</div>" +
      '<div class="ac-methods" role="list" aria-label="Способы входа">' + on.map(btn).join("") +
      off.map((m) => '<span role="listitem" class="ac-method is-off"><span class="ac-method-n">' + METHOD[m.id][1] + '</span><span class="ac-method-s">' + (METHOD[m.id][3] || "скоро") + "</span></span>").join("") + "</div>" +
      errP("ac-e-login") +
      '<p class="ac-note">Без пароля. Кабинет заводится при&nbsp;первом входе, согласие спросим после кода. Корзина и&nbsp;избранное с&nbsp;этого устройства переедут в&nbsp;него.</p>' +
      '<p class="ac-note">' + policyLink() + "</p>";
  }
  // короткая фраза у галки + ссылка на полный текст той же версии (consents/README A1, п. 3): [Текст](url) → кнопка документа
  function label(type, fallback) {
    const doc = (S.docs || {})[type];
    let t = esc((doc && doc.short_label) || fallback);
    let linked = false;
    t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, (_, txt) => { linked = true; return '<button type="button" class="ac-a" data-ac-doc="' + type + '">' + txt + "</button>"; });
    return t + (linked ? "" : ' · <button type="button" class="ac-a" data-ac-doc="' + type + '">текст</button>');
  }
  function consentsHTML(form) {
    const f = S.flow, mk = (S.docs || {}).marketing;
    return '<fieldset class="ac-consents"><legend class="vh">Согласия</legend>' +
      check("pd", label("pd_processing", "Даю согласие на обработку моих персональных данных") + ' <span class="ac-req">обязательно</span>', f.pd, ' aria-describedby="ac-e-' + form + '"') +
      (mk ? check("mkt", label("marketing", mk.short_label) + ' <span class="ac-opt">по желанию</span>', f.mkt) : "") +
      "</fieldset>";
  }
  function scrEmail() { // выключено контрактом 0.2 (email_code → next); экран живёт до решения юриста
    return '<form class="ac-form" data-ac-form="email" novalidate>' +
      field("ac-email", "почта:", '<input class="ac-in" id="ac-email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="имя@почта.ру" value="' + esc(S.flow.email || "") + '" required aria-describedby="ac-e-email">') +
      errP("ac-e-email") + '<button type="submit" class="btn btn--dark btn--wide ac-submit">Получить код ' + ARROW + "</button>" +
      '<p class="ac-note">Пришлём 6&nbsp;цифр. Письма нет&nbsp;— проверь «Спам». ' + policyLink() + "</p></form>";
  }
  function scrPhone() {
    return '<form class="ac-form" data-ac-form="phone" novalidate>' +
      field("ac-phone", "телефон:", '<span class="ac-pre" aria-hidden="true">+7</span><input class="ac-in" id="ac-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="999 123-45-67" value="' + esc(S.flow.phoneView || "") + '" required aria-describedby="ac-e-phone ac-phone-h">',
        "Номер российский. Сначала позвоним: отвечать не&nbsp;нужно, код&nbsp;— последние 4&nbsp;цифры входящего. Не&nbsp;дозвонимся&nbsp;— пришлём SMS.") +
      errP("ac-e-phone") + '<button type="submit" class="btn btn--dark btn--wide ac-submit">Получить код ' + ARROW + "</button>" +
      '<p class="ac-note">' + policyLink() + "</p></form>";
  }
  function scrTg() { // выключено контрактом 0.2 (иностранная система); Telegram — канал уведомлений
    return '<div class="ac-form"><p class="ac-lead ac-lead--ink">Вход через Telegram выключен: по&nbsp;закону войти на&nbsp;российский сайт можно по&nbsp;номеру телефона или через российские системы.</p>' +
      '<p class="ac-p">Telegram подключается в&nbsp;кабинете как канал уведомлений: статус заказа и&nbsp;«вернулось в&nbsp;наличии» придут в&nbsp;бот, почта продублирует.</p>' +
      (A.demo ? '<button type="button" class="btn btn--line btn--wide" data-ac-act="tg-demo">Демо: как выглядел бы вход</button>' : "") +
      '<button type="button" class="btn btn--dark btn--wide" data-ac-go="phone">Войти по телефону ' + ARROW + "</button>" + errP("ac-e-tg") + "</div>";
  }
  function scrCode() {
    const f = S.flow, ch = f.challenge || {}, len = ch.code_length || 6;
    const how = ch.channel === "email" ? "Код в письме на " : ch.channel === "flash_call" ? "Звоним на " : "Код в SMS на ";
    return '<form class="ac-form" data-ac-form="code" novalidate>' +
      '<p class="ac-lead ac-lead--ink">' + how + "<b>" + esc(ch.destination_masked || "") + "</b>." + (ch.channel === "flash_call" ? " Не&nbsp;бери трубку: код&nbsp;— последние 4&nbsp;цифры номера." : "") + "</p>" +
      '<div class="ac-field"><label class="ac-k" for="ac-code">код:</label>' +
      '<div class="ac-cells" style="--n:' + len + '"><input class="ac-code" id="ac-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="' + len + '" aria-describedby="ac-e-code' + (A.demo ? " ac-code-demo" : "") + '">' +
      Array.from({ length: len }, () => '<span class="ac-cell" aria-hidden="true"></span>').join("") + "</div></div>" +
      (A.demo ? '<p class="ac-hint ac-hint--demo" id="ac-code-demo">демо: код&nbsp;— ' + "123456".slice(0, len) + "</p>" : "") +
      errP("ac-e-code") +
      '<button type="submit" class="btn btn--dark btn--wide ac-submit">' + (f.purpose === "delete" ? "Удалить кабинет" : f.purpose === "contact" ? "Подтвердить" : "Войти") + "</button>" +
      '<div class="ac-code-foot"><button type="button" class="ac-a" data-ac-act="resend" data-ac-resend disabled>Ещё раз через 0:' + String(ch.resend_after || 60).padStart(2, "0") + "</button>" +
      (f.purpose === "login" && ch.channel === "flash_call" ? '<button type="button" class="ac-a" data-ac-act="sms">Не звонят? SMS</button>' : "") +
      (f.purpose === "login" ? '<button type="button" class="ac-a" data-ac-back-to="' + (f.method || "phone") + '">' + (f.method === "email" ? "Другая почта" : "Другой номер") + "</button>" : "") + "</div></form>";
  }
  function scrConsent() { // после кода (409 consent_required) или после VK/Яндекс (?login=consent / required_consents)
    const f = S.flow;
    return '<form class="ac-form" data-ac-form="consent" novalidate><p class="ac-lead ac-lead--ink">' +
      (f.challenge || (S.session && S.session.authenticated && !(S.c.consents)) ? "Новый кабинет. Без согласия на&nbsp;обработку данных завести его не&nbsp;можем&nbsp;— реклама отдельно и&nbsp;по&nbsp;желанию." : "Вышла новая версия текста&nbsp;— подтверди, чтобы продолжить.") + "</p>" +
      consentsHTML("consent") + errP("ac-e-consent") +
      '<button type="submit" class="btn btn--dark btn--wide ac-submit" data-ac-needs-pd' + (f.pd ? "" : " disabled") + ">Продолжить</button>" +
      '<p class="ac-hint" data-ac-pd-hint' + (f.pd ? " hidden" : "") + ">Кнопка заработает, когда отметишь обязательное.</p>" +
      '<p class="ac-note">' + policyLink() + (S.session && S.session.authenticated ? ' · <button type="button" class="ac-a" data-ac-act="consent-cancel">Не сейчас — выйти</button>' : "") + "</p></form>";
  }
  function md(s) { // минимальный markdown текстов A1: #, ##, -, **, `
    const inl = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<code>$1</code>");
    let out = "", list = false;
    String(s || "").split(/\n/).forEach((ln) => {
      const t = ln.trim();
      if (/^- /.test(t)) { if (!list) { out += "<ul>"; list = true; } out += "<li>" + inl(t.slice(2)) + "</li>"; return; }
      if (list) { out += "</ul>"; list = false; }
      if (!t) return;
      if (/^## /.test(t)) out += "<h4>" + inl(t.slice(3)) + "</h4>"; else if (/^# /.test(t)) out += "<h3>" + inl(t.slice(2)) + "</h3>"; else out += "<p>" + inl(t) + "</p>";
    });
    return out + (list ? "</ul>" : "");
  }
  function scrDoc() {
    const t = S.arg && S.arg.type, doc = S.c["doc:" + t];
    if (!doc) return errP("ac-e-doc");
    return '<article class="ac-doc"><p class="t-mono ac-muted">версия ' + esc(doc.version) + (doc.published_at ? " · от " + dt(doc.published_at) : "") + "</p>" + md(doc.body_md) +
      (doc.url ? '<p><a class="link" href="' + esc(doc.url) + '" target="_blank" rel="noopener">Полный текст на&nbsp;сайте ' + ARROW + "</a></p>" : "") + "</article>";
  }
  function scrBye() {
    const del = S.flow.deleted;
    return '<div class="ac-empty">' + mascotHTML(del ? "404" : "cart-empty", "ac-mz--empty") + '<p class="ac-big">' + (del ? "Кабинет удалится." : "Вышли.") + "</p>" +
      '<p class="ac-lead ac-lead--ink">' + (del ? "Сотрём " + dLong(del.purge_at) + ". Передумаешь&nbsp;— войди до&nbsp;этой даты и&nbsp;отмени." : "На этом устройстве кабинета больше нет.") + "</p>" +
      '<button type="button" class="btn btn--dark" data-ac-close>Закрыть</button></div>';
  }

  /* ---------- экраны: кабинет ---------- */
  function activeOrder() { return (S.c.orders || []).filter((o) => !FINAL[o.status])[0]; }
  function navHTML(inline) {
    const c = S.c, cnt = { orders: c.orders && c.orders.length, restock: c.restock && c.restock.length, favs: favSet().length };
    return '<nav class="ac-nav' + (inline ? " ac-nav--inline" : "") + '" aria-label="Разделы кабинета">' +
      NAV.map((n) => row(n[0], n[1], cnt[n[0]] ? '<span class="ac-cnt">' + cnt[n[0]] + "</span>" : "", S.screen === n[0] || (S.screen === "order" && n[0] === "orders") ? ' aria-current="page"' : "")).join("") +
      '<button type="button" class="ac-row ac-row--out" data-ac-act="logout"><span class="ac-row-l">Выйти</span></button></nav>';
  }
  function helloHTML() {
    const u = S.user || {}, name = displayName();
    return '<div class="ac-hello"><div class="ac-ava" aria-hidden="true">' + esc(initial()) + "</div><div>" +
      '<p class="ac-hi">' + (name ? "Привет, " + esc(name) + "." : "Привет.") + "</p>" +
      '<p class="t-mono ac-hello-k">' + esc(u.phone ? fmtPhone(u.phone) : u.email || (u.has_telegram ? "Telegram" : u.has_vk ? "VK ID" : "")) + "</p>" +
      (!name ? '<button type="button" class="ac-a ac-a--w" data-ac-go="profile">Как к&nbsp;тебе обращаться?</button>' : "") + "</div></div>";
  }
  function scrHome() {
    const o0 = activeOrder(), o = o0 && (S.c["order:" + o0.id] || o0), sess = S.session || {};
    return (sess.deletion_scheduled_at ? '<div class="ac-alert" role="status"><p>Кабинет удалится ' + dLong(sess.deletion_scheduled_at) + '.</p><button type="button" class="btn btn--dark" data-ac-act="undelete">Отменить удаление</button></div>' : "") +
      '<div class="ac-only-m">' + helloHTML() + "</div>" +
      (o ? '<button type="button" class="ac-now" data-ac-go="order" data-ac-arg="' + esc(o.id) + '"><span class="ac-now-h"><span class="t-mono">заказ ' + esc(o.number) + "</span>" + chip(o.status, o.status_label) + "</span>" +
        stepper(o, true) + '<span class="ac-now-f t-mono">' + (o.is_preorder && o.ship_from ? "отправка с&nbsp;" + dLong(o.ship_from) : "") + '<span class="ac-row-go" aria-hidden="true">' + ARROW + "</span></span></button>" :
        '<div class="ac-now ac-now--empty"><p class="t-mono">активных заказов нет</p><button type="button" class="link" data-ac-nav="drop">Смотреть дроп ' + ARROW + "</button></div>") +
      navHTML(true);
  }
  function orderCard(o) {
    return '<li><button type="button" class="ac-order" data-ac-go="order" data-ac-arg="' + esc(o.id) + '">' +
      '<span class="ac-order-h"><span class="ac-order-n">' + esc(o.number) + '</span><span class="t-mono ac-muted">' + dt(o.created_at) + "</span>" + chip(o.status, o.status_label) + "</span>" +
      '<span class="ac-order-th">' + (o.preview || []).slice(0, 4).map((i) => thumb(i.product_id, "ac-thumb--s")).join("") + "</span>" +
      '<span class="ac-order-f"><span class="t-mono">' + plural(o.items_count || 0, "вещь", "вещи", "вещей") + (o.is_preorder && !FINAL[o.status] && o.ship_from ? " · отправка с&nbsp;" + dShort(o.ship_from) : "") +
      (o.example ? ' · <span class="ac-ex">пример</span>' : "") + '</span><span class="ac-order-sum">' + money(o.total) + "</span></span></button></li>";
  }
  function scrOrders() {
    const list = S.c.orders || [];
    if (!list.length) return '<div class="ac-empty">' + mascotHTML("cart-empty", "ac-mz--empty") + '<p class="ac-big">Заказов нет.</p><p class="ac-lead ac-lead--ink">Пока.</p><button type="button" class="btn btn--dark" data-ac-nav="drop">Смотреть дроп ' + ARROW + "</button></div>";
    return '<ul class="ac-orders">' + list.map(orderCard).join("") + "</ul>";
  }
  function scrOrder() {
    const o = S.c["order:" + S.arg];
    if (!o) return errP("ac-e-order");
    const dl = o.delivery || {};
    const live = !FINAL[o.status];
    return '<div class="ac-ord-head"><p class="ac-big">' + esc(o.number) + "</p>" + chip(o.status, o.status_label) + "</div>" +
      '<p class="t-mono ac-muted">от ' + dt(o.created_at) + (o.example ? ' · <span class="ac-ex">пример</span>' : "") + "</p>" +
      (o.is_preorder && live ? '<section class="ac-sec" aria-labelledby="ac-pre-h"><h3 class="ac-h" id="ac-pre-h">Предзаказ</h3>' +
        '<p class="ac-eta">' + esc((o.preorder && o.preorder.eta_text) || (o.ship_from ? "Отправим с " + dLong(o.ship_from) : "")) + "</p>" + stepper(o) + "</section>" : "") +
      '<section class="ac-sec" aria-labelledby="ac-it-h"><h3 class="ac-h" id="ac-it-h">Вещи</h3><ul class="ac-lines">' + (o.items || []).map((i) =>
        '<li class="ac-line">' + thumb(i.product_id) + '<span class="ac-line-i"><span class="ac-line-n">' + esc(i.name || pname(i.product_id)) + '</span><span class="t-mono ac-muted">размер ' + esc(i.size) +
        (i.qty > 1 ? " · " + i.qty + " шт." : "") + '</span></span><span class="ac-line-p">' + money(i.price * i.qty) + "</span></li>").join("") + "</ul>" +
      '<dl class="kv ac-sum"><div><dt>вещи:</dt><dd>' + money(o.subtotal) + "</dd></div>" + (o.discount ? "<div><dt>скидка:</dt><dd>−" + money(o.discount) + "</dd></div>" : "") +
      "<div><dt>доставка:</dt><dd>" + (o.delivery_price ? money(o.delivery_price) : "—") + "</dd></div>" + (o.refunded_amount ? "<div><dt>вернули:</dt><dd>" + money(o.refunded_amount) + "</dd></div>" : "") +
      '<div class="ac-sum-t"><dt>итого:</dt><dd>' + money(o.total) + "</dd></div></dl></section>" +
      '<section class="ac-sec" aria-labelledby="ac-dl-h"><h3 class="ac-h" id="ac-dl-h">Доставка</h3><p class="ac-p">' + esc(dl.address_text || "—") + "</p>" +
      (dl.track_number ? '<p class="t-mono">трек: ' + (dl.track_url ? '<a href="' + esc(dl.track_url) + '" target="_blank" rel="noopener">' + esc(dl.track_number) + "</a>" : esc(dl.track_number)) + "</p>" : "") +
      (dl.pickup_until ? '<p class="t-mono">ждёт в пункте до ' + dt(dl.pickup_until) + "</p>" : "") + "</section>" +
      '<section class="ac-sec" aria-labelledby="ac-tl-h"><h3 class="ac-h" id="ac-tl-h">История</h3><ol class="ac-tl">' + (o.timeline || []).slice().reverse().map((t) =>
        '<li><span class="t-mono ac-muted">' + dt(t.at) + " " + tm(t.at) + '</span><span class="ac-tl-l">' + esc(t.label || (STATUS[t.status] || [t.status])[0]) + "</span>" + (t.note ? '<span class="ac-muted ac-tl-n">' + esc(t.note) + "</span>" : "") + "</li>").join("") + "</ol></section>" +
      '<div class="ac-acts">' + (o.can_pay ? '<button type="button" class="btn btn--accent btn--wide" data-ac-act="pay" data-ac-arg="' + esc(o.id) + '">Оплатить · ' + money(o.total) + "</button>" : "") +
      (o.receipt_url ? '<a class="link" href="' + esc(o.receipt_url) + '" target="_blank" rel="noopener">Чек ' + ARROW + "</a>" : "") +
      (live ? '<p class="ac-note">Отменить или поменять размер&nbsp;— напиши нам до&nbsp;отправки. Кнопка отмены появится в&nbsp;кабинете следующим этапом.</p>' : "") + "</div>" + errP("ac-e-order");
  }
  function sizeLabel(s) { return s === "*" ? "любой размер" : "размер " + s; }
  function scrRestock() {
    const list = (S.c.restock || []).filter((s) => s.status !== "cancelled");
    const f = S.flow.rs || {}, ps = GV.products || [];
    const pid = f.pid || (ps.filter((p) => !anyStock(p))[0] || ps[0] || {}).id;
    const p = prod(pid);
    const sizes = p ? ["*"].concat(Object.keys(p.sizes)) : ["*"];
    const sz = f.size && sizes.indexOf(f.size) > -1 ? f.size : "*";
    const inStock = p && sz !== "*" && p.sizes[sz] > 0;
    const ST = { pending: ["подтверди почту", "wait"], active: ["ждём", "ok"], notified: ["вернулось", "go"] };
    return '<p class="ac-lead ac-lead--ink">Скажем, когда вещь или твой размер вернутся. Тем же каналом, что в&nbsp;«Уведомлениях».</p>' +
      (list.length ? '<ul class="ac-subs">' + list.map((s) => {
        const q = prod(s.product_id), st = ST[s.status] || [s.status, "ok"], back_ = q && (s.size === "*" ? anyStock(q) : q.sizes[s.size] > 0);
        return '<li class="ac-sub">' + thumb(s.product_id) + '<span class="ac-line-i"><span class="ac-line-n">' + esc(pname(s.product_id)) + '</span><span class="t-mono ac-muted">' + sizeLabel(s.size) +
          (s.channels && s.channels.length ? " · " + s.channels.map(chName).join(", ") : "") + '</span><span class="ac-chip ac-chip--' + st[1] + '">' + st[0] + "</span>" +
          (back_ ? '<button type="button" class="ac-a" data-open-product="' + esc(s.product_id) + '">Есть&nbsp;— смотреть</button>' : "") + "</span>" +
          '<button type="button" class="ac-x" data-ac-act="unsub" data-ac-arg="' + esc(s.id) + '" aria-label="Отписаться: ' + esc(pname(s.product_id)) + ", " + sizeLabel(s.size) + '"></button></li>';
      }).join("") + "</ul>" : '<div class="ac-empty ac-empty--s">' + mascotHTML("subscribe", "ac-mz--s") + '<p class="t-mono">подписок нет</p></div>') +
      '<form class="ac-form ac-card" data-ac-form="restock" novalidate><h3 class="ac-h">Новая подписка</h3>' +
      '<div class="ac-field"><label class="ac-k" for="ac-rs-p">вещь:</label><select class="ac-sel" id="ac-rs-p" name="pid" data-ac-live="rs-p">' +
      ps.map((x) => '<option value="' + x.id + '"' + (x.id === pid ? " selected" : "") + ">" + esc(x.name) + (anyStock(x) ? "" : " — разобрали") + "</option>").join("") + "</select></div>" +
      '<fieldset class="ac-field ac-sizes"><legend class="ac-k">размер:</legend><div class="ac-pills">' + sizes.map((s) => {
        const out = p && s !== "*" && !(p.sizes[s] > 0);
        return '<label class="ac-pill"><input type="radio" name="size" value="' + s + '"' + (s === sz ? " checked" : "") + ' data-ac-live="rs-s"><span>' + (s === "*" ? "любой" : s) + (out ? '<i class="ac-pill-x" aria-hidden="true"></i><span class="vh"> — нет</span>' : "") + "</span></label>";
      }).join("") + "</div></fieldset>" +
      (inStock ? '<p class="ac-hint">' + sz + ' есть прямо сейчас. <button type="button" class="ac-a" data-open-product="' + esc(pid) + '">Открыть вещь</button></p>' : "") +
      errP("ac-e-restock") + '<button type="submit" class="btn btn--dark btn--wide">Сообщить, когда вернётся</button></form>' +
      '<p class="ac-note">Перезапуск всего дропа&nbsp;— <button type="button" class="ac-a" data-ac-nav="next">в&nbsp;блоке «Разобрали&nbsp;— вернём»</button>; подписка оттуда тоже попадёт сюда.</p>';
  }
  function scrFavs() {
    const ids = favSet().filter(prod);
    if (!ids.length) return '<div class="ac-empty">' + mascotHTML("cart-empty", "ac-mz--empty") + '<p class="ac-big">Пусто.</p><p class="ac-lead ac-lead--ink">Жми ♡ на&nbsp;вещи в&nbsp;дропе&nbsp;— соберётся здесь.</p><button type="button" class="btn btn--dark" data-ac-nav="drop">Смотреть дроп ' + ARROW + "</button></div>";
    return '<ul class="ac-favs">' + ids.map((id) => {
      const p = prod(id), ok = anyStock(p);
      return '<li class="ac-fav"><button type="button" class="ac-fav-o" data-open-product="' + esc(id) + '">' + thumb(id, "ac-thumb--l") +
        '<span class="ac-line-n">' + esc(p.name) + '</span><span class="ac-fav-f"><span class="t-mono">' + money(p.price) + '</span><span class="t-mono ac-muted">' + (ok ? "предзаказ" : "разобрали") + "</span></span></button>" +
        heartHTML(id, "ac-heart--fav") + (ok ? "" : '<button type="button" class="ac-a ac-fav-rs" data-ac-act="rs-any" data-ac-arg="' + esc(id) + '">Сообщить о&nbsp;перезапуске</button>') + "</li>";
    }).join("") + "</ul>";
  }
  function scrProfile() {
    const u = S.c.me || S.user || {};
    const tg = u.telegram || {}, vk = u.vk || {};
    return '<form class="ac-form" data-ac-form="profile" novalidate>' +
      field("ac-dn", "как обращаться:", '<input class="ac-in" id="ac-dn" name="display_name" maxlength="40" autocomplete="nickname" value="' + esc(u.display_name || "") + '" placeholder="Петя">', "Так подпишем письма и&nbsp;сообщения.") +
      '<div class="ac-2">' + field("ac-fn", "имя:", '<input class="ac-in" id="ac-fn" name="first_name" maxlength="60" autocomplete="given-name" value="' + esc(u.first_name || "") + '">') +
      field("ac-ln", "фамилия:", '<input class="ac-in" id="ac-ln" name="last_name" maxlength="60" autocomplete="family-name" value="' + esc(u.last_name || "") + '">') + "</div>" +
      '<p class="ac-hint">Имя и&nbsp;фамилия&nbsp;— для получателя посылки. Можно оставить пустыми.</p>' +
      errP("ac-e-profile") + '<button type="submit" class="btn btn--dark btn--wide">Сохранить</button></form>' +
      '<section class="ac-sec" aria-labelledby="ac-ct-h"><h3 class="ac-h" id="ac-ct-h">Контакты и входы</h3><dl class="ac-dl">' +
      '<div><dt>почта</dt><dd>' + (u.email ? esc(u.email) + (u.email_verified ? ' <span class="ac-ok">подтверждена</span>' : "") : '<span class="ac-muted">нет</span>') + '</dd><dd><button type="button" class="ac-a" data-ac-go="contact" data-ac-arg="email">' + (u.email ? "Сменить" : "Добавить") + "</button></dd></div>" +
      '<div><dt>телефон</dt><dd>' + (u.phone ? esc(fmtPhone(u.phone)) : '<span class="ac-muted">нет</span>') + '</dd><dd><button type="button" class="ac-a" data-ac-go="contact" data-ac-arg="phone">' + (u.phone ? "Сменить" : "Добавить") + "</button></dd></div>" +
      '<div><dt>VK ID</dt><dd>' + (vk.linked || u.has_vk ? "привязан" : '<span class="ac-muted">нет</span>') + "</dd><dd></dd></div>" +
      '<div><dt>Яндекс ID</dt><dd>' + ((u.yandex && u.yandex.linked) || u.has_yandex ? "привязан" : '<span class="ac-muted">нет</span>') + "</dd><dd></dd></div>" +
      '<div><dt>Telegram</dt><dd>' + (tg.linked || u.has_telegram ? "@" + esc(tg.username || "привязан") : '<span class="ac-muted">нет</span>') + '</dd><dd><button type="button" class="ac-a" data-ac-go="notify">Уведомления</button></dd></div>' +
      "</dl><p class=\"ac-note\">Вход&nbsp;— по&nbsp;телефону, VK ID или Яндекс ID. Почта&nbsp;— для чеков и&nbsp;писем. Новый контакт подтверждаем кодом.</p></section>";
  }
  function fmtPhone(p) { const x = String(p || "").replace(/\D/g, "").replace(/^[78]/, ""); return x.length === 10 ? "+7 " + x.slice(0, 3) + " " + x.slice(3, 6) + "-" + x.slice(6, 8) + "-" + x.slice(8) : p; }
  function scrContact() {
    const kind = S.arg === "phone" ? "phone" : "email";
    return '<form class="ac-form" data-ac-form="contact" novalidate>' +
      (kind === "email" ? field("ac-cv", "новая почта:", '<input class="ac-in" id="ac-cv" name="value" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="имя@почта.ру" aria-describedby="ac-e-contact">') :
        field("ac-cv", "новый телефон:", '<span class="ac-pre" aria-hidden="true">+7</span><input class="ac-in" id="ac-cv" name="value" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="999 123-45-67" aria-describedby="ac-e-contact">')) +
      errP("ac-e-contact") + '<button type="submit" class="btn btn--dark btn--wide">Прислать код ' + ARROW + "</button></form>";
  }
  const FIT = [["slim", "по фигуре"], ["regular", "как есть"], ["oversize", "свободно"]];
  function scrSizes() {
    const s = S.c.size || {}, us = s.usual_sizes || {};
    const rec = localRecommend(Object.assign({}, s, S.flow.sizeDraft || {}), "hoodie-crack");
    const num = (k, label, unit, min, max) => field("ac-" + k, label, '<input class="ac-in ac-in--n" id="ac-' + k + '" name="' + k + '" type="number" inputmode="numeric" min="' + min + '" max="' + max + '" step="1" value="' + (s[k] == null ? "" : s[k]) + '" data-ac-live="size"><span class="ac-unit" aria-hidden="true">' + unit + "</span>");
    const pills = (name, list, cur) => '<div class="ac-pills">' + list.map((v) => '<label class="ac-pill"><input type="radio" name="' + name + '" value="' + v[0] + '"' + (v[0] === cur ? " checked" : "") + ' data-ac-live="size"><span>' + v[1] + "</span></label>").join("") + "</div>";
    const SZ = ["XS", "S", "M", "L", "XL", "XXL"].map((x) => [x, x]);
    return '<p class="ac-lead ac-lead--ink">Заполни, что знаешь&nbsp;— подскажем размер по&nbsp;сетке каждой вещи. Всё необязательно.</p>' +
      '<form class="ac-form" data-ac-form="sizes" novalidate><div class="ac-2">' + num("height_cm", "рост:", "см", 140, 220) + num("weight_kg", "вес:", "кг", 35, 200) +
      num("chest_cm", "грудь:", "см", 60, 160) + num("waist_cm", "талия:", "см", 50, 160) + num("hips_cm", "бёдра:", "см", 60, 170) + num("inseam_cm", "шаг:", "см", 55, 100) + "</div>" +
      '<fieldset class="ac-field"><legend class="ac-k">как любишь сидеть:</legend>' + pills("fit", FIT, s.fit) + "</fieldset>" +
      '<fieldset class="ac-field"><legend class="ac-k">обычно верх:</legend>' + pills("top", SZ, us.top) + "</fieldset>" +
      '<fieldset class="ac-field"><legend class="ac-k">обычно низ:</legend>' + pills("bottom", SZ.slice(1), us.bottom) + "</fieldset>" +
      '<div class="ac-rec" aria-live="polite" data-ac-rec>' + recHTML(rec) + "</div>" +
      errP("ac-e-sizes") + '<button type="submit" class="btn btn--dark btn--wide">Сохранить</button>' +
      (s.updated_at ? '<button type="button" class="ac-a ac-a--c" data-ac-act="size-clear">Стереть размерный профиль</button>' : "") + "</form>" +
      '<p class="ac-note">Как мерить: грудь&nbsp;— по&nbsp;самой широкой части, шаг&nbsp;— от&nbsp;паха до&nbsp;пола без&nbsp;обуви. <button type="button" class="ac-a" data-ac-sizes-table>Размерная сетка</button></p>';
  }
  function recHTML(r) {
    return r.size ? '<p class="t-mono ac-muted">по сетке дропа</p><p class="ac-rec-s">' + r.size + '</p><p class="ac-rec-t">' + esc(r.reason) + (r.alternative ? ". " + esc(r.alternative.size) + "&nbsp;— " + esc(r.alternative.when) + "." : ".") + "</p>"
      : '<p class="t-mono ac-muted">по сетке дропа</p><p class="ac-rec-t">' + esc(r.reason) + "</p>";
  }
  const PROV = { cdek: "СДЭК", russianpost: "Почта России", yandex: "Яндекс Доставка", ozon: "Ozon" };
  function addrText(a) {
    if (a.kind === "pickup" && a.pickup) return (PROV[a.pickup.provider] || "") + " · " + (a.pickup.address || a.pickup.name || "");
    const c = a.courier || {};
    return [c.city, c.street, c.house && "д. " + c.house, c.flat && "кв. " + c.flat].filter(Boolean).join(", ");
  }
  function scrAddresses() {
    const list = S.c.addresses || [];
    return (list.length ? '<ul class="ac-addrs">' + list.map((a) =>
      '<li class="ac-addr' + (a.is_default ? " is-def" : "") + '"><p class="ac-addr-h"><span class="t-mono">' + (a.kind === "pickup" ? "пункт выдачи" : "курьер") + "</span>" +
      (a.is_default ? '<span class="ac-chip ac-chip--ok">основной</span>' : "") + "</p>" +
      (a.label ? '<p class="ac-line-n">' + esc(a.label) + "</p>" : "") + '<p class="ac-p">' + esc(addrText(a)) + "</p>" +
      (a.pickup && a.pickup.work_hours ? '<p class="t-mono ac-muted">' + esc(a.pickup.work_hours) + "</p>" : "") +
      '<p class="t-mono ac-muted">' + esc((a.recipient && a.recipient.name) || "") + (a.recipient && a.recipient.phone ? " · " + esc(fmtPhone(a.recipient.phone)) : "") + "</p>" +
      '<div class="ac-addr-a">' + (a.is_default ? "" : '<button type="button" class="ac-a" data-ac-act="addr-def" data-ac-arg="' + esc(a.id) + '">Сделать основным</button>') +
      '<button type="button" class="ac-a" data-ac-go="address" data-ac-arg="' + esc(a.id) + '">Изменить</button>' +
      '<button type="button" class="ac-a" data-ac-act="addr-del" data-ac-arg="' + esc(a.id) + '">Удалить</button></div></li>').join("") + "</ul>" :
      '<div class="ac-empty ac-empty--s"><p class="t-mono">адресов нет&nbsp;— при&nbsp;оформлении подставим основной</p></div>') +
      (list.length < 10 ? '<button type="button" class="btn btn--line btn--wide" data-ac-go="address" data-ac-arg="new">Добавить адрес или пункт выдачи</button>' : "") + errP("ac-e-addr");
  }
  function scrAddress() {
    const a = (S.c.addresses || []).filter((x) => x.id === S.arg)[0] || {};
    const f = S.flow.addr || (S.flow.addr = { kind: a.kind || "pickup", provider: (a.pickup && a.pickup.provider) || "cdek", city: (a.pickup && a.pickup.city) || (a.courier && a.courier.city) || "", point: a.pickup || null, points: null });
    const c = a.courier || {}, r = a.recipient || {};
    const ccity = c.city || f.city || "";
    return '<form class="ac-form" data-ac-form="address" novalidate>' +
      '<fieldset class="ac-seg"><legend class="ac-k">как получить:</legend>' + [["pickup", "Пункт выдачи"], ["courier", "Курьер"]].map((k) =>
        '<label><input type="radio" name="kind" value="' + k[0] + '"' + (f.kind === k[0] ? " checked" : "") + ' data-ac-live="addr-kind"><span>' + k[1] + "</span></label>").join("") + "</fieldset>" +
      (f.kind === "pickup" ?
        '<div class="ac-field"><label class="ac-k" for="ac-prov">служба:</label><select class="ac-sel" id="ac-prov" name="provider" data-ac-live="addr-prov">' +
        Object.keys(PROV).map((k) => '<option value="' + k + '"' + (k === f.provider ? " selected" : "") + ">" + PROV[k] + "</option>").join("") + "</select></div>" +
        '<div class="ac-find">' + field("ac-city", "город:", '<input class="ac-in" id="ac-city" name="city" autocomplete="address-level2" value="' + esc(f.city) + '" placeholder="Москва">') +
        '<button type="button" class="btn btn--line ac-find-b" data-ac-act="find-pvz">Найти</button></div>' +
        (f.points ? (f.points.length ? '<fieldset class="ac-pvz"><legend class="vh">Пункты выдачи</legend>' + f.points.map((p, i) =>
          '<label class="ac-pvz-i"><input type="radio" name="point" value="' + i + '"' + (f.point && f.point.point_id === p.point_id ? " checked" : "") + "><span><b>" + esc(p.name || p.address) + "</b><br>" + esc(p.address) +
          (p.work_hours ? '<br><span class="t-mono ac-muted">' + esc(p.work_hours) + "</span>" : "") + "</span></label>").join("") + "</fieldset>" : '<p class="ac-hint">Ничего не нашли. Проверь город.</p>') :
          f.point ? '<p class="ac-p">Сейчас: ' + esc(f.point.name || "") + ", " + esc(f.point.address) + "</p>" : "") :
        field("ac-cc", "город:", '<input class="ac-in" id="ac-cc" name="city" autocomplete="address-level2" value="' + esc(ccity) + '">') +
        field("ac-cs", "улица:", '<input class="ac-in" id="ac-cs" name="street" autocomplete="address-line1" value="' + esc(c.street || "") + '">') +
        '<div class="ac-3">' + field("ac-ch", "дом:", '<input class="ac-in" id="ac-ch" name="house" value="' + esc(c.house || "") + '">') +
        field("ac-cf", "кв.:", '<input class="ac-in" id="ac-cf" name="flat" value="' + esc(c.flat || "") + '">') +
        field("ac-ci", "индекс:", '<input class="ac-in" id="ac-ci" name="postcode" inputmode="numeric" autocomplete="postal-code" value="' + esc(c.postcode || "") + '">') + "</div>" +
        '<div class="ac-2">' + field("ac-ce", "подъезд:", '<input class="ac-in" id="ac-ce" name="entrance" value="' + esc(c.entrance || "") + '">') +
        field("ac-cl", "этаж:", '<input class="ac-in" id="ac-cl" name="floor" value="' + esc(c.floor || "") + '">') + "</div>" +
        field("ac-cm", "курьеру:", '<input class="ac-in" id="ac-cm" name="comment" maxlength="300" value="' + esc(c.comment || "") + '" placeholder="домофон не работает, звони">')) +
      '<h3 class="ac-h">Получатель</h3>' +
      field("ac-rn", "имя:", '<input class="ac-in" id="ac-rn" name="r_name" autocomplete="name" value="' + esc(r.name || [S.user && S.user.first_name, S.user && S.user.last_name].filter(Boolean).join(" ")) + '">') +
      field("ac-rp", "телефон:", '<span class="ac-pre" aria-hidden="true">+7</span><input class="ac-in" id="ac-rp" name="r_phone" type="tel" inputmode="tel" autocomplete="tel-national" value="' + esc(r.phone ? fmtPhone(r.phone).replace(/^\+7 /, "") : "") + '">') +
      field("ac-al", "подпись:", '<input class="ac-in" id="ac-al" name="label" maxlength="40" value="' + esc(a.label || "") + '" placeholder="дом, работа…">') +
      check("is_default", "Основной адрес", a.is_default || !(S.c.addresses || []).length) +
      errP("ac-e-address") + '<button type="submit" class="btn btn--dark btn--wide">Сохранить</button></form>';
  }
  const CH = { email: "почта", telegram: "Telegram", sms: "SMS", push: "пуш" };
  const chName = (c) => CH[c] || c;
  const CATS = [["order_status", "Статус заказа", "сервисные"], ["restock", "Вернулось в наличии", "по подписке"], ["early_access", "Ранний доступ", "реклама"], ["news", "Новости и дропы", "реклама"]];
  function scrNotify() {
    const n = S.flow.notif || (S.flow.notif = JSON.parse(JSON.stringify(S.c.notif || {})));
    const chs = ["email", "telegram", "sms"], av = n.channels || {};
    const mk = ((S.c.consents && S.c.consents.current) || []).filter((c) => c.type === "marketing")[0];
    const mkOn = mk && mk.status === "granted";
    const u = S.c.me || S.user || {};
    return '<section class="ac-sec ac-sec--0" aria-labelledby="ac-chn-h"><h3 class="ac-h" id="ac-chn-h">Каналы</h3><dl class="ac-dl">' +
      '<div><dt>почта</dt><dd>' + (av.email && av.email.available ? esc(av.email.address || "подключена") : '<span class="ac-muted">нет почты</span>') + '</dd><dd>' + (av.email && av.email.available ? "" : '<button type="button" class="ac-a" data-ac-go="contact" data-ac-arg="email">Добавить</button>') + "</dd></div>" +
      '<div><dt>Telegram</dt><dd>' + (av.telegram && av.telegram.available ? "бот подключён" + (u.telegram && u.telegram.username ? " · @" + esc(u.telegram.username) : "") : '<span class="ac-muted">не подключён</span>') + "</dd><dd>" +
      (av.telegram && av.telegram.available ? '<button type="button" class="ac-a" data-ac-act="tg-unlink">Отключить</button>' : '<button type="button" class="ac-a" data-ac-act="tg-link">Подключить бота</button>') + "</dd></div>" +
      '<div><dt>SMS</dt><dd>' + (av.sms && av.sms.available ? "доступны" : '<span class="ac-muted">пока нет</span>') + "</dd><dd></dd></div></dl></section>" +
      '<form class="ac-form" data-ac-form="notify" novalidate><table class="ac-mx"><caption class="vh">Что и куда присылать</caption><thead><tr><th scope="col"><span class="vh">Что</span></th>' +
      chs.map((c) => '<th scope="col">' + CH[c] + "</th>").join("") + "</tr></thead><tbody>" +
      CATS.map((cat) => {
        const sel = (n.categories && n.categories[cat[0]]) || [], adv = cat[2] === "реклама";
        return '<tr><th scope="row"><span class="ac-mx-n">' + cat[1] + '</span><span class="t-mono ac-muted">' + cat[2] + "</span></th>" + chs.map((c) => {
          const can = av[c] && av[c].available, dis = !can || (adv && !mkOn);
          return '<td><input type="checkbox" class="ac-cb" name="' + cat[0] + ":" + c + '"' + (sel.indexOf(c) > -1 ? " checked" : "") + (dis ? " disabled" : "") +
            ' aria-label="' + cat[1] + " — " + CH[c] + (!can ? " (канал не подключён)" : adv && !mkOn ? " (нужно согласие на рекламу)" : "") + '" data-ac-live="notif"></td>';
        }).join("") + "</tr>";
      }).join("") + "</tbody></table>" +
      '<p class="ac-hint">Сервисные (статус заказа) выключить совсем нельзя&nbsp;— нужен хотя бы один канал. Что уходит в&nbsp;Telegram, дублируем на&nbsp;почту.</p>' +
      (!mkOn ? '<div class="ac-card ac-card--q">' + check("mkt", label("marketing", "Хочу получать новости о дропах и предложения GRINCHIN"), false, ' data-ac-live="mkt"') +
        '<p class="ac-hint">Без этой галки рекламные строки выключены. Отозвать&nbsp;— в&nbsp;любой момент.</p></div>' : "") +
      '<div class="ac-field"><span class="ac-k">тихие часы:</span><div class="ac-qh"><label><span class="vh">с</span><input class="ac-in ac-in--t" type="time" name="qh_from" value="' + esc((n.quiet_hours || {}).from || "22:00") + '"></label><span aria-hidden="true">—</span>' +
      '<label><span class="vh">до</span><input class="ac-in ac-in--t" type="time" name="qh_to" value="' + esc((n.quiet_hours || {}).to || "09:00") + '"></label></div><p class="ac-hint">В это время не&nbsp;пишем (кроме кода входа). Москва.</p></div>' +
      errP("ac-e-notify") + '<button type="submit" class="btn btn--dark btn--wide">Сохранить</button></form>';
  }
  const CNAME = { pd_processing: "Обработка персональных данных", marketing: "Рекламные рассылки", cookies_analytics: "Аналитика (cookies)", restock_notify: "Сообщить о перезапуске", pd_cross_border: "Передача за рубеж" };
  const CST = { granted: ["дано", "ok"], withdrawn: ["отозвано", "off"], not_granted: ["не давал(а)", "off"], outdated: ["устарело", "wait"] };
  function scrPrivacy() {
    const cs = S.c.consents || { current: [], history: [] }, ex = S.c.exp || {};
    return '<section class="ac-sec ac-sec--0" aria-labelledby="ac-cs-h"><h3 class="ac-h" id="ac-cs-h">Согласия</h3><ul class="ac-cs">' + (cs.current || []).map((c) => {
      const st = CST[c.status] || [c.status, "ok"];
      return '<li class="ac-cs-i"><span class="ac-line-i"><span class="ac-line-n">' + (CNAME[c.type] || c.type) + '</span><span class="t-mono ac-muted">' +
        (c.granted_at && c.status === "granted" ? "с " + dt(c.granted_at) + " · версия " + esc(c.version) : c.withdrawn_at ? "отозвано " + dt(c.withdrawn_at) : "") + "</span>" +
        '<span class="ac-chip ac-chip--' + st[1] + '">' + st[0] + "</span></span>" +
        '<span class="ac-cs-a">' + (S.docs && S.docs[c.type] ? '<button type="button" class="ac-a" data-ac-doc="' + c.type + '">Текст</button>' : "") +
        (c.status === "granted" && c.withdrawable ? '<button type="button" class="ac-a" data-ac-act="withdraw" data-ac-arg="' + c.type + '">Отозвать</button>' :
          c.type !== "pd_processing" && c.status !== "granted" ? '<button type="button" class="ac-a" data-ac-act="grant" data-ac-arg="' + c.type + '">Дать согласие</button>' : "") + "</span></li>";
    }).join("") + "</ul>" +
      ((cs.history || []).length ? '<details class="acc ac-hist"><summary>Журнал согласий</summary><div class="acc-body"><ol class="ac-tl">' + cs.history.map((h) =>
        '<li><span class="t-mono ac-muted">' + dt(h.at) + " " + tm(h.at) + '</span><span class="ac-tl-l">' + (h.action === "grant" ? "дано" : h.action === "withdraw" ? "отозвано" : "истекло") + ": " + (CNAME[h.type] || h.type) +
        '</span><span class="t-mono ac-muted ac-tl-n">' + esc(h.version || "") + " · " + esc(h.method || "") + "</span></li>").join("") + "</ol></div></details>" : "") + "</section>" +
      '<section class="ac-sec" aria-labelledby="ac-ex-h"><h3 class="ac-h" id="ac-ex-h">Выгрузка данных</h3>' +
      '<p class="ac-p">Всё, что знаем о&nbsp;тебе: профиль, адреса, заказы, подписки, согласия. Архив JSON + читаемая страница.</p>' +
      (ex.status === "ready" ? '<p class="t-mono">готова · ссылка живёт до ' + dt(ex.expires_at) + " " + tm(ex.expires_at) + '</p><button type="button" class="btn btn--line btn--wide" data-ac-act="export-dl">Скачать</button>' :
        ex.status === "queued" || ex.status === "processing" ? '<p class="t-mono">готовим с ' + dt(ex.requested_at) + "&nbsp;— пришлём ссылку на&nbsp;почту, обычно за&nbsp;пару минут</p>" :
          '<button type="button" class="btn btn--line btn--wide" data-ac-act="export">Запросить выгрузку</button>') + "</section>" +
      '<section class="ac-sec" aria-labelledby="ac-ss-h"><h3 class="ac-h" id="ac-ss-h">Устройства</h3>' +
      '<button type="button" class="ac-a" data-ac-act="logout-all">Выйти на&nbsp;всех устройствах</button></section>' +
      '<section class="ac-sec ac-sec--danger" aria-labelledby="ac-dl-h2"><h3 class="ac-h" id="ac-dl-h2">Удалить кабинет</h3>' +
      '<p class="ac-p">Сотрём профиль, адреса, избранное, подписки и&nbsp;размеры. Заказы и&nbsp;чеки оставим&nbsp;— так требует закон.</p>' +
      '<button type="button" class="btn btn--ghost-dark btn--wide" data-ac-go="del">Удалить кабинет</button></section>' + errP("ac-e-privacy");
  }
  function scrDel() {
    const ds = S.c.deletion || {}, ret = ds.retained && ds.retained.length ? ds.retained : RETAINED;
    if (ds.status === "scheduled") return '<p class="ac-lead ac-lead--ink">Удаление уже запланировано на&nbsp;' + dLong(ds.purge_at) + '.</p><button type="button" class="btn btn--dark btn--wide" data-ac-act="undelete">Отменить удаление</button>';
    return '<form class="ac-form" data-ac-form="del" novalidate><p class="ac-lead ac-lead--ink">Кабинет выключим сразу и&nbsp;выйдем со&nbsp;всех устройств. Сотрём через 7&nbsp;дней&nbsp;— до&nbsp;этого можно войти и&nbsp;передумать.</p>' +
      '<dl class="ac-dl ac-dl--w"><div><dt>сотрём</dt><dd>профиль, контакты, адреса, избранное, подписки, размерный профиль, настройки</dd></div>' +
      ret.map((r) => "<div><dt>оставим</dt><dd>" + esc(r.what) + ' <span class="ac-muted">— ' + esc(r.basis) + "</span></dd></div>").join("") + "</dl>" +
      '<p class="ac-hint">Оплаченный и&nbsp;ещё не&nbsp;доставленный заказ удаление не&nbsp;отменит: кабинет сотрём после его завершения.</p>' +
      field("ac-why", "почему (если хочешь):", '<textarea class="ac-in ac-ta" id="ac-why" name="reason" maxlength="500" rows="2"></textarea>') +
      check("sure", "Понимаю: после " + dLong(new Date(Date.now() + 7 * 86400e3).toISOString()) + " вернуть кабинет нельзя", false, ' required aria-describedby="ac-e-del"') +
      errP("ac-e-del") + '<button type="submit" class="btn btn--dark btn--wide">Прислать код для удаления</button>' +
      '<p class="ac-note">Сначала скачай <button type="button" class="ac-a" data-ac-go="privacy">выгрузку</button>, если нужна.</p></form>';
  }

  const SCREENS = { login: scrLogin, email: scrEmail, phone: scrPhone, tg: scrTg, code: scrCode, consent: scrConsent, doc: scrDoc, bye: scrBye,
    home: scrHome, orders: scrOrders, order: scrOrder, restock: scrRestock, favs: scrFavs, profile: scrProfile, contact: scrContact, sizes: scrSizes,
    addresses: scrAddresses, address: scrAddress, notify: scrNotify, privacy: scrPrivacy, del: scrDel };

  function render(loading) {
    const scr = S.screen;
    let t = TITLES[scr] || "Кабинет";
    if (scr === "order" && S.c["order:" + S.arg]) t = "Заказ " + S.c["order:" + S.arg].number;
    if (scr === "doc") t = (S.c["doc:" + (S.arg && S.arg.type)] || {}).title || (S.docs && S.arg && S.docs[S.arg.type] || {}).title || "Документ";
    if (scr === "contact") t = S.arg === "phone" ? "Телефон" : "Почта";
    if (scr === "address") t = S.arg === "new" ? "Новый адрес" : "Адрес";
    titleEl.textContent = t;
    backEl.hidden = !S.hist.length;
    ov.dataset.screen = scr;
    ov.dataset.authed = authed() ? "1" : "0";
    destroyMascots();
    const inner = loading ? '<div class="ac-load" role="status"><span class="ac-load-b"></span><span class="ac-load-b"></span><span class="ac-load-b"></span><span class="vh">Загружаем…</span></div>' :
      (SCREENS[scr] || scrLogin)();
    body.innerHTML = authed() && !GUEST[scr]
      ? '<div class="ac-grid"><aside class="ac-aside">' + helloHTML() + navHTML(false) + '</aside><div class="ac-main" data-scr="' + scr + '">' + inner + "</div></div>"
      : '<div class="ac-main ac-main--solo" data-scr="' + scr + '">' + inner + "</div>";
    if (loading) return;
    panel.scrollTop = 0;
    mountMascots();
    afterRender(scr);
  }
  function afterRender(scr) {
    // фокус: на заголовок шита (скринридер слышит, куда пришли); на формах ввода — в первое поле
    const auto = { email: "#ac-email", phone: "#ac-phone", code: "#ac-code", contact: "#ac-cv" }[scr];
    const el = auto && $(auto, body);
    if (el && !("ontouchstart" in W && scr !== "code")) el.focus({ preventScroll: true }); else if (openFlag) titleEl.focus({ preventScroll: true });
    if (scr === "code") startResend();
  }
  function startResend() {
    const btn = $("[data-ac-resend]", body), ch = S.flow.challenge;
    if (!btn || !ch) return;
    let left = Math.max(0, Math.round((S.flow.sentAt + (ch.resend_after || 60) * 1000 - Date.now()) / 1000));
    const tick = () => {
      if (left <= 0) { clearInterval(resendT); btn.disabled = false; btn.textContent = "Прислать код ещё раз"; return; }
      btn.textContent = "Ещё раз через " + Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0"); left--;
    };
    tick(); resendT = setInterval(tick, 1000);
  }
  const toast = (m, ms) => { if (GV.toast) GV.toast(m, ms || 2600); };
  function setErr(id, msg, input) {
    const p = $("#" + id, body) || $("[data-ac-err]", body); if (p) p.textContent = msg || "";
    if (input) { if (msg) { input.setAttribute("aria-invalid", "true"); input.focus(); } else input.removeAttribute("aria-invalid"); }
  }
  async function busy(btn, fn) {
    if (S.busy) return; S.busy = true;
    const b = btn || null; if (b) { b.setAttribute("aria-busy", "true"); b.disabled = true; }
    try { return await fn(); } finally { S.busy = false; if (b && d.contains(b)) { b.removeAttribute("aria-busy"); b.disabled = false; } }
  }
  function grants(form, method) {
    const out = [], docs = S.docs || {};
    const add = (type) => { const x = docs[type] || {}; out.push({ type, version: x.version || "current", text_hash: x.text_hash, method }); };
    if (form.pd && form.pd.checked) add("pd_processing");
    if (form.mkt && form.mkt.checked) add("marketing");
    return out;
  }
  function needPd(form, errId) {
    if (form.pd && !form.pd.checked) { setErr(errId, "Без согласия на обработку данных кабинет не завести.", form.pd); return false; }
    return true;
  }
  const phoneDigits = (v) => { let x = String(v || "").replace(/\D/g, ""); if (x.length === 11 && /^[78]/.test(x)) x = x.slice(1); return x; };

  /* ---------- формы ---------- */
  async function onSubmit(e) {
    const f = e.target.closest("[data-ac-form]");
    if (!f) return;
    e.preventDefault();
    const kind = f.dataset.acForm, sb = $('[type="submit"]', f);
    if (kind === "email") {
      const v = f.email.value.trim();
      S.flow.email = v;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return setErr("ac-e-email", v ? "В почте опечатка?" : "Нужна почта.", f.email);
      return busy(sb, async () => {
        try { S.flow.challenge = await A.call("emailStart", null, { email: v }); S.flow.sentAt = Date.now(); S.flow.purpose = "login"; S.flow.method = "email"; go("code"); }
        catch (er) { setErr("ac-e-email", errText(er)); }
      });
    }
    if (kind === "phone") {
      const x = phoneDigits(f.phone.value);
      if (x.length !== 10) return setErr("ac-e-phone", x ? "Номер — 10 цифр после +7." : "Нужен номер.", f.phone);
      S.flow.phoneView = f.phone.value;
      return busy(sb, async () => {
        try { S.flow.challenge = await A.call("phoneStart", null, { phone: "+7" + x, channel: "flash_call" }); S.flow.sentAt = Date.now(); S.flow.purpose = "login"; S.flow.method = "phone"; go("code"); }
        catch (er) { setErr("ac-e-phone", errText(er)); }
      });
    }
    if (kind === "code") {
      const code = (f.code.value || "").replace(/\D/g, "");
      const len = (S.flow.challenge && S.flow.challenge.code_length) || 6;
      if (code.length !== len) return setErr("ac-e-code", "Нужно " + len + " цифр.", f.code);
      return busy(sb, () => submitCode(code, f));
    }
    if (kind === "consent") {
      if (!needPd(f, "ac-e-consent")) return;
      const cons = grants(f, "checkbox:lk_signup");
      return busy(sb, async () => {
        try {
          if (S.flow.tgDemo) { await afterLogin(await A.call("telegram", null, { consents: cons, guest_cart: cartItems() })); }
          else if (S.flow.challenge && S.flow.code && !authed()) { S.flow.consents = cons; await submitCode(S.flow.code, null); }
          else { await A.call("grant", null, { consents: cons }); S.c.consents = null; await loadSession(); await finishLogin(); }
        } catch (er) { setErr("ac-e-consent", errText(er)); }
      });
    }
    if (kind === "profile") {
      const patch = { display_name: f.display_name.value.trim().slice(0, 40), first_name: f.first_name.value.trim() || null, last_name: f.last_name.value.trim() || null };
      return busy(sb, async () => {
        try { S.c.me = await A.call("updateMe", null, patch); S.user = Object.assign({}, S.user, { display_name: S.c.me.display_name }); paintHeader(); toast("Сохранили."); render(); }
        catch (er) { setErr("ac-e-profile", errText(er)); }
      });
    }
    if (kind === "contact") {
      const kindC = S.arg === "phone" ? "phone" : "email";
      let v = f.value.value.trim();
      if (kindC === "phone") { const x = phoneDigits(v); if (x.length !== 10) return setErr("ac-e-contact", "Номер — 10 цифр после +7.", f.value); v = "+7" + x; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return setErr("ac-e-contact", "В почте опечатка?", f.value);
      return busy(sb, async () => {
        try { S.flow.challenge = await A.call("contactStart", null, { kind: kindC, value: v }); S.flow.sentAt = Date.now(); S.flow.purpose = "contact"; go("code"); }
        catch (er) { setErr("ac-e-contact", errText(er)); }
      });
    }
    if (kind === "restock") {
      const pid = f.pid.value, size = (f.size && f.size.value) || "*";
      return busy(sb, async () => {
        try { await restockAdd([{ product_id: pid, size }], true); S.c.restock = null; S.flow.rs = null; await need("restock"); render(); toast("Подписка есть. Скажем первыми."); }
        catch (er) { setErr("ac-e-restock", errText(er)); }
      });
    }
    if (kind === "sizes") {
      const sp = sizeFromForm(f);
      for (const k of ["height_cm", "weight_kg", "chest_cm", "waist_cm", "hips_cm", "inseam_cm"]) {
        const inp = f[k], v = sp[k];
        if (v != null && (v < +inp.min || v > +inp.max)) return setErr("ac-e-sizes", "Проверь «" + $(".ac-k", inp.closest(".ac-field")).textContent.replace(":", "") + "»: от " + inp.min + " до " + inp.max + ".", inp);
      }
      return busy(sb, async () => {
        try { S.c.size = await A.call("putSize", null, sp); S.flow.sizeDraft = null; toast("Размеры сохранили."); render(); }
        catch (er) { setErr("ac-e-sizes", errText(er)); }
      });
    }
    if (kind === "address") return busy(sb, () => saveAddress(f));
    if (kind === "notify") {
      const n = notifFromForm(f);
      if (!n.categories.order_status.length) return setErr("ac-e-notify", "Статус заказа — хотя бы в один канал.");
      return busy(sb, async () => {
        try {
          if (f.mkt && f.mkt.checked) { await A.call("grant", null, { consents: grants({ mkt: f.mkt }, "checkbox:lk_notify") }); S.c.consents = null; }
          S.c.notif = await A.call("putNotif", null, n); S.flow.notif = null; await need("consents"); toast("Настройки сохранили."); render();
        } catch (er) { setErr("ac-e-notify", er.code === "consent_required" ? "Для рекламных строк нужна галка согласия." : errText(er)); }
      });
    }
    if (kind === "del") {
      if (!f.sure.checked) return setErr("ac-e-del", "Поставь галку — это необратимо.", f.sure);
      S.flow.delReason = f.reason.value.trim() || undefined;
      return busy(sb, async () => {
        try { S.flow.challenge = await A.call("deletion", null, { reason: S.flow.delReason }); S.flow.sentAt = Date.now(); S.flow.purpose = "delete"; go("code"); }
        catch (er) { setErr("ac-e-del", er.code === "active_orders" ? "Есть оплаченный заказ в пути — удалим кабинет после его завершения или через поддержку." : errText(er)); }
      });
    }
  }
  async function submitCode(code, f) {
    const fl = S.flow;
    try {
      if (fl.purpose === "contact") {
        S.c.me = await A.call("contactVerify", null, { challenge_id: fl.challenge.challenge_id, code });
        S.flow = {}; S.c.notif = null; await loadSession(); toast("Контакт подтвердили."); S.hist = [["home", null]]; go("profile", null, true); return;
      }
      if (fl.purpose === "delete") {
        const st = await A.call("deletion", null, { challenge_id: fl.challenge.challenge_id, code, reason: fl.delReason });
        await doLogout(false);
        S.flow = { deleted: st }; S.hist = []; go("bye", null, true); return;
      }
      const r = await A.call("verify", null, { challenge_id: fl.challenge.challenge_id, code, consents: fl.consents && fl.consents.length ? fl.consents : undefined, guest_cart: cartItems() });
      await afterLogin(r);
    } catch (er) {
      if (er.code === "consent_required") { S.flow.code = code; go("consent"); return; }
      if (er.code === "challenge_expired") { setErr("ac-e-code", errText(er)); const inp = f && f.code; if (inp) { inp.value = ""; inp.setAttribute("aria-invalid", "true"); } return; }
      if (f && f.code) f.code.value = "";
      setErr("ac-e-code", errText(er), f && f.code);
      if (f && f.code) paintCells(f.code);
    }
  }
  function sizeFromForm(f) {
    const n = (k) => { const v = f[k].value.trim(); return v === "" ? null : Math.round(+v); };
    const r = (name) => { const x = f.querySelector('input[name="' + name + '"]:checked'); return x ? x.value : null; };
    return { height_cm: n("height_cm"), weight_kg: n("weight_kg"), chest_cm: n("chest_cm"), waist_cm: n("waist_cm"), hips_cm: n("hips_cm"), inseam_cm: n("inseam_cm"),
      fit: r("fit"), usual_sizes: { top: r("top"), bottom: r("bottom") } };
  }
  function notifFromForm(f) {
    const n = JSON.parse(JSON.stringify(S.flow.notif || S.c.notif || {}));
    n.categories = {};
    CATS.forEach((c) => { n.categories[c[0]] = ["email", "telegram", "sms"].filter((ch) => { const x = f[c[0] + ":" + ch]; return x && x.checked; }); });
    n.quiet_hours = Object.assign({}, n.quiet_hours || {}, { from: f.qh_from.value || "22:00", to: f.qh_to.value || "09:00", tz: "Europe/Moscow" });
    return n;
  }
  async function saveAddress(f) {
    const fl = S.flow.addr || {}, kind = fl.kind;
    const ph = phoneDigits(f.r_phone.value), nm = f.r_name.value.trim();
    if (!nm) return setErr("ac-e-address", "Кому отдать посылку? Нужно имя.", f.r_name);
    if (ph.length !== 10) return setErr("ac-e-address", "Телефон получателя — 10 цифр после +7.", f.r_phone);
    const a = { kind, label: f.label.value.trim() || null, is_default: !!f.is_default.checked, recipient: { name: nm, phone: "+7" + ph }, pickup: null, courier: null };
    if (kind === "pickup") {
      const sel = f.querySelector('input[name="point"]:checked');
      const pt = sel && fl.points ? fl.points[+sel.value] : fl.point;
      if (!pt) return setErr("ac-e-address", "Выбери пункт выдачи: город → «Найти».", f.city);
      a.pickup = pt;
    } else {
      const g = (k) => (f[k].value || "").trim() || null;
      if (!g("city") || !g("street") || !g("house")) return setErr("ac-e-address", "Нужны город, улица и дом.", !g("city") ? f.city : !g("street") ? f.street : f.house);
      a.courier = { city: g("city"), street: g("street"), house: g("house"), flat: g("flat"), entrance: g("entrance"), floor: g("floor"), postcode: g("postcode"), comment: g("comment"), fias_id: null };
    }
    try {
      if (S.arg && S.arg !== "new") await A.call("updateAddress", { id: S.arg }, a); else await A.call("addAddress", null, a);
      S.c.addresses = null; S.flow.addr = null; toast("Адрес сохранили."); S.hist.pop(); go("addresses", null, true);
    } catch (er) { setErr("ac-e-address", errText(er)); }
  }

  /* ---------- клики ---------- */
  let curProduct = null;
  async function onClick(e) {
    const t = e.target;
    const x = t.closest("[data-ac-close]"); if (x) { e.preventDefault(); closeLK(true); return; }
    if (t.closest("[data-ac-back]")) { e.preventDefault(); back(); return; }
    const bt = t.closest("[data-ac-back-to]"); if (bt) { e.preventDefault(); S.hist = S.hist.slice(0, -1); go(bt.dataset.acBackTo, null, true); return; }
    const doc = t.closest("[data-ac-doc]");
    if (doc) {
      e.preventDefault();
      // политика — документ, а не согласие: в api берём ссылку из конфига (policyUrl), в демо — пересказ черновика A1
      if (doc.dataset.acDoc === "privacy_policy" && !A.demo) { if (CFG.policyUrl) W.open(CFG.policyUrl, "_blank", "noopener"); return; }
      keepForm(); go("doc", { type: doc.dataset.acDoc }); return;
    }
    const nv = t.closest("[data-ac-nav]"); if (nv) { e.preventDefault(); closeLK(false); setTimeout(() => _nav && _nav.call(GV, nv.dataset.acNav), instant() ? 0 : 60); return; }
    if (t.closest("[data-ac-sizes-table]")) { e.preventDefault(); closeLK(false); _open && _open.call(GV, "sizes"); return; }
    const g = t.closest("[data-ac-go]");
    if (g) {
      e.preventDefault();
      const scr = g.dataset.acGo, arg = g.dataset.acArg || null;
      if (scr === "address") S.flow.addr = null;
      if (scr === "notify") S.flow.notif = null;
      // desktop: пункты левой колонки — разделы верхнего уровня, история не копится
      if (g.closest(".ac-aside")) { S.hist = scr === "home" ? [] : [["home", null]]; go(scr, arg, true); return; }
      go(scr, arg); return;
    }
    const a = t.closest("[data-ac-act]");
    if (!a) return;
    e.preventDefault();
    const act = a.dataset.acAct, arg = a.dataset.acArg;
    if (act === "logout") { await busy(a, () => doLogout(false)); S.flow = {}; S.hist = []; go("bye", null, true); return; }
    if (act === "logout-all") { if (!W.confirm("Выйти на всех устройствах, включая это?")) return; await busy(a, () => doLogout(true)); go("bye", null, true); return; }
    if (act === "oauth") { // VK ID / Яндекс ID: сервер отдаёт authorize_url, возврат — ?login=ok|consent (согласие спросим после)
      const prov = arg === "yandex" ? "yandex" : "vk";
      return busy(a, async () => {
        try {
          const r = await A.call(prov === "yandex" ? "yandexStart" : "vkStart", null, { return_to: (CFG.returnPath || location.pathname) + "?lk=home" });
          if (A.demo) { toast("Демо: здесь откроется " + (prov === "yandex" ? "Яндекс ID" : "VK ID") + " и вернёт обратно."); return afterLogin(await A.call("oauthDemo", { provider: prov }, { guest_cart: cartItems() })); }
          location.assign(r.authorize_url);
        } catch (er) { setErr("ac-e-login", errText(er)); }
      });
    }
    if (act === "sms") return busy(a, async () => { // запасной канал, если звонок не дошёл
      try { const fl = S.flow; fl.challenge = await A.call("phoneStart", null, { phone: "+7" + phoneDigits(fl.phoneView), channel: "sms" }); fl.sentAt = Date.now(); toast("Отправили SMS."); render(); }
      catch (er) { setErr("ac-e-code", errText(er)); }
    });
    if (act === "tg-demo") return busy(a, async () => { try { await afterLogin(await A.call("telegram", null, { guest_cart: cartItems() })); } catch (er) { if (er.code === "consent_required") { S.flow = { tgDemo: 1 }; S.flow.code = null; go("consent"); } else setErr("ac-e-tg", errText(er)); } });
    if (act === "consent-cancel") { await busy(a, () => doLogout(false)); S.flow = {}; S.hist = []; go("login", null, true); return; }
    if (act === "resend") {
      const fl = S.flow, ch = fl.challenge;
      return busy(a, async () => {
        try {
          if (fl.purpose === "delete") fl.challenge = await A.call("deletion", null, { reason: fl.delReason });
          else if (fl.purpose === "contact") return go("contact", S.hist.length ? S.hist[S.hist.length - 1][1] : "email", true);
          else if (fl.method === "phone") fl.challenge = await A.call("phoneStart", null, { phone: "+7" + phoneDigits(fl.phoneView), channel: ch && ch.channel });
          else fl.challenge = await A.call("emailStart", null, { email: fl.email });
          fl.sentAt = Date.now(); toast("Отправили новый код."); render();
        } catch (er) { setErr("ac-e-code", errText(er)); }
      });
    }
    if (act === "unsub") return busy(a, async () => {
      try { const s = (S.c.restock || []).filter((r) => r.id === arg)[0]; await A.call("delRestock", { id: arg });
        if (s && prod(s.product_id) && prod(s.product_id).subs) delete prod(s.product_id).subs[s.size];
        S.c.restock = (S.c.restock || []).filter((r) => r.id !== arg); toast("Отписали."); render(); }
      catch (er) { toast(errText(er)); }
    });
    if (act === "rs-any") return restockAdd([{ product_id: arg, size: "*" }]);
    if (act === "pay") return busy(a, async () => {
      try { const r = await A.call("pay", { id: arg }); if (A.demo || /^demo:/.test(r.confirmation_url)) toast("Демо: здесь откроется оплата ЮKassa."); else location.assign(r.confirmation_url); }
      catch (er) { setErr("ac-e-order", errText(er)); }
    });
    if (act === "size-clear") { if (!W.confirm("Стереть размерный профиль?")) return; return busy(a, async () => { try { await A.call("delSize"); S.c.size = null; await need("size"); toast("Стёрли."); render(); } catch (er) { toast(errText(er)); } }); }
    if (act === "addr-def") return busy(a, async () => { try { await A.call("updateAddress", { id: arg }, { is_default: true }); S.c.addresses = null; await need("addresses"); render(); } catch (er) { setErr("ac-e-addr", errText(er)); } });
    if (act === "addr-del") { if (!W.confirm("Удалить адрес?")) return; return busy(a, async () => { try { await A.call("deleteAddress", { id: arg }); S.c.addresses = null; await need("addresses"); toast("Удалили."); render(); } catch (er) { setErr("ac-e-addr", errText(er)); } }); }
    if (act === "find-pvz") {
      const f = a.closest("form"), fl = S.flow.addr;
      fl.city = f.city.value.trim(); fl.provider = f.provider.value;
      keepAddrRecipient(f);
      if (!fl.city) return setErr("ac-e-address", "Сначала город.", f.city);
      return busy(a, async () => {
        try { fl.points = (await A.call("pickupPoints", { query: { provider: fl.provider, city: fl.city } })).items || []; render(); const r0 = $('input[name="point"]', body); if (r0) r0.focus(); }
        catch (er) { setErr("ac-e-address", errText(er)); }
      });
    }
    if (act === "tg-link") return busy(a, async () => {
      try {
        const r = await A.call("tgLink");
        if (A.demo || /^demo:/.test(r.url)) { toast("Демо: здесь откроется бот в Telegram. Считаем, что ты нажал «Старт»."); }
        else W.open(r.url, "_blank", "noopener");
        S.c.notif = null; S.c.me = null; S.flow.notif = null; await need("notif"); await need("me"); render();
      } catch (er) { setErr("ac-e-notify", errText(er)); }
    });
    if (act === "tg-unlink") return busy(a, async () => { try { await A.call("tgUnlink"); S.c.notif = null; S.c.me = null; S.flow.notif = null; await need("notif"); await need("me"); render(); } catch (er) { setErr("ac-e-notify", errText(er)); } });
    if (act === "withdraw") {
      if (arg === "pd_processing") { if (!W.confirm("Без этого согласия кабинет вести нельзя: отзыв = удаление кабинета. Перейти к удалению?")) return; go("del"); return; }
      return busy(a, async () => { try { await A.call("withdraw", { type: arg }); S.c.consents = null; S.c.notif = null; await need("consents"); toast("Отозвали. Рекламу больше не пришлём."); render(); } catch (er) { setErr("ac-e-privacy", errText(er)); } });
    }
    if (act === "grant") return busy(a, async () => { try { await A.call("grant", null, { consents: [{ type: arg, version: (S.docs && S.docs[arg] && S.docs[arg].version) || "current", text_hash: S.docs && S.docs[arg] && S.docs[arg].text_hash, method: "button:lk_privacy" }] }); S.c.consents = null; await need("consents"); render(); } catch (er) { setErr("ac-e-privacy", errText(er)); } });
    if (act === "export") return busy(a, async () => { try { S.c.exp = await A.call("exportReq"); toast("Запрос принят."); render(); } catch (er) { setErr("ac-e-privacy", errText(er)); } });
    if (act === "export-dl") {
      const ex = S.c.exp || {};
      if (A.demo) { const b = A.exportBlob(); if (!b) return; const u = URL.createObjectURL(b), l = d.createElement("a"); l.href = u; l.download = "grinchin-kabinet-demo.json"; d.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); return; }
      if (ex.download_url) location.assign(ex.download_url);
      return;
    }
    if (act === "undelete") return busy(a, async () => { try { await A.call("cancelDeletion"); S.c.deletion = null; await loadSession(); toast("Удаление отменили. Кабинет живёт."); go("home", null, true); } catch (er) { toast(errText(er)); } });
  }
  // переходы на документ и обратно не теряют введённое
  function keepForm() {
    const f = $("[data-ac-form]", body); if (!f) return;
    if (f.email) S.flow.email = f.email.value;
    if (f.phone) S.flow.phoneView = f.phone.value;
    if (f.pd) S.flow.pd = f.pd.checked;
    if (f.mkt) S.flow.mkt = f.mkt.checked;
    if (f.channel) S.flow.channel = f.channel.value;
  }
  function keepAddrRecipient(f) { /* поля перерисуются — сохраняем введённое в черновик адреса через value атрибуты */
    const fl = S.flow.addr; if (!fl) return;
    fl.draft = { r_name: f.r_name.value, r_phone: f.r_phone.value, label: f.label.value };
  }
  function onInput(e) {
    const t = e.target, live = t.dataset && t.dataset.acLive;
    if (t.id === "ac-phone" || t.id === "ac-rp" || (t.id === "ac-cv" && t.type === "tel")) { // маска 999 123-45-67
      const x = phoneDigits(t.value).slice(0, 10);
      const v = x.slice(0, 3) + (x.length > 3 ? " " + x.slice(3, 6) : "") + (x.length > 6 ? "-" + x.slice(6, 8) : "") + (x.length > 8 ? "-" + x.slice(8, 10) : "");
      if (t.value !== v && !(e.inputType || "").startsWith("delete")) t.value = v;
      if (t.id === "ac-phone") S.flow.phoneView = t.value;
    }
    if (t.id === "ac-code") {
      t.value = t.value.replace(/\D/g, "").slice(0, +t.maxLength || 6);
      paintCells(t);
      setErr("ac-e-code", "");
      if (t.value.length === (+t.maxLength || 6)) { const f = t.form; if (f && f.requestSubmit) f.requestSubmit(); }
    }
    if (t.id === "ac-email") S.flow.email = t.value;
    if (t.getAttribute("aria-invalid")) t.removeAttribute("aria-invalid");
    if (live === "size") {
      const f = t.form; S.flow.sizeDraft = sizeFromForm(f);
      const box = $("[data-ac-rec]", body); if (box) box.innerHTML = recHTML(localRecommend(S.flow.sizeDraft, "hoodie-crack"));
    }
  }
  // клетки кода — картинка поверх одного прозрачного поля (автоподстановка кода из SMS на iOS/Android работает)
  function paintCells(inp) {
    const cells = $$(".ac-cell", inp.parentNode), v = inp.value, on = d.activeElement === inp;
    cells.forEach((c, i) => { c.textContent = v[i] || ""; c.classList.toggle("is-cur", on && i === Math.min(v.length, cells.length - 1)); });
  }
  function onChange(e) {
    const t = e.target, live = t.dataset && t.dataset.acLive;
    if (t.name === "pd" || t.name === "mkt") {
      S.flow[t.name] = t.checked;
      if (t.checked) $$("[data-ac-err]", body).forEach((p) => { p.textContent = ""; });
      // README A1 п. 2: «Продолжить» неактивна, пока не отмечено обязательное
      if (t.name === "pd") { const b = $("[data-ac-needs-pd]", body), h = $("[data-ac-pd-hint]", body); if (b) b.disabled = !t.checked; if (h) h.hidden = t.checked; }
    }
    if (live === "rs-p" || live === "rs-s") {
      const f = t.form; S.flow.rs = { pid: f.pid.value, size: live === "rs-s" ? t.value : "*" };
      render(); const back_ = $(live === "rs-p" ? "#ac-rs-p" : 'input[name="size"]:checked', body); if (back_) back_.focus();
    }
    if (live === "addr-kind" || live === "addr-prov") {
      const f = t.form, fl = S.flow.addr; keepAddrRecipient(f);
      if (live === "addr-kind") fl.kind = t.value; else { fl.provider = t.value; fl.points = null; fl.point = null; }
      render(); const back_ = $(live === "addr-kind" ? 'input[name="kind"]:checked' : "#ac-prov", body); if (back_) back_.focus();
      const dr = fl.draft, f2 = $('[data-ac-form="address"]', body);
      if (dr && f2) { f2.r_name.value = dr.r_name; f2.r_phone.value = dr.r_phone; f2.label.value = dr.label; }
    }
    if (live === "notif") {
      const f = t.form; S.flow.notif = notifFromForm(f);
      if (!S.flow.notif.categories.order_status.length && t.name.indexOf("order_status:") === 0) { t.checked = true; S.flow.notif = notifFromForm(f); setErr("ac-e-notify", "Статус заказа — хотя бы в один канал."); }
    }
    if (live === "mkt") { // галка рекламы открывает рекламные строки сразу (сохранится по «Сохранить»)
      $$('input[name^="early_access:"], input[name^="news:"]', t.form).forEach((x) => {
        const ch = x.name.split(":")[1], av = ((S.flow.notif || S.c.notif || {}).channels || {})[ch];
        x.disabled = !t.checked || !(av && av.available);
      });
    }
  }
  ov.addEventListener("click", onClick);
  ov.addEventListener("submit", onSubmit);
  ov.addEventListener("input", onInput);
  ov.addEventListener("change", onChange);
  ov.addEventListener("focusin", (e) => { if (e.target.id === "ac-code") paintCells(e.target); });
  ov.addEventListener("focusout", (e) => { if (e.target.id === "ac-code") setTimeout(() => paintCells(e.target), 0); });

  /* ---------- сердечко на карточках дропа и в карточке товара (вёрстку V2 не трогаем: кнопка поверх) ---------- */
  d.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-ac-fav]");
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    favToggle(b.dataset.acFav, b);
  }, true);
  function injectCards() {
    $$("[data-grid] .card[data-id]").forEach((c) => { if (!$(":scope > .ac-heart", c)) c.insertAdjacentHTML("beforeend", heartHTML(c.dataset.id, "ac-heart--card")); });
  }
  function injectSheet() {
    const info = $("#product-sheet .ps-info");
    if (!info || !curProduct || $(".ac-heart", info)) return;
    info.insertAdjacentHTML("afterbegin", heartHTML(curProduct, "ac-heart--ps"));
  }
  const grid = $("[data-grid]"), psb = $("[data-ps-body]");
  if ("MutationObserver" in W) {
    if (grid) new MutationObserver(injectCards).observe(grid, { childList: true });
    if (psb) new MutationObserver(injectSheet).observe(psb, { childList: true });
  }
  injectCards();

  /* ---------- «Разобрали — вернём»: формы соседей → кабинет ---------- */
  d.addEventListener("submit", (e) => {
    // форма «Сообщить» в карточке товара (shop.js сам ставит p.subs[size]); ловим после него — по пузырю
    if (!e.target.closest || !e.target.closest("[data-notify-form]") || !curProduct) return;
    const p = prod(curProduct); if (!p) return;
    setTimeout(() => {
      const subs = p.subs || {};
      const t = Object.keys(subs).map((s) => ({ product_id: p.id, size: s }));
      if (t.length) restockAdd(t, !authed());
    }, 0);
  });
  d.addEventListener("grinchin:subscribe", () => {
    // блок #next: перезапуск дропа = все «разобранные» вещи, любой размер (своей цели «весь дроп» в контракте A1 пока нет)
    const so = (GV.products || []).filter((p) => !anyStock(p));
    restockAdd((so.length ? so : GV.products || []).map((p) => ({ product_id: p.id, size: "*" })));
  });

  /* ---------- старт ---------- */
  if (A.demo && demoEl) demoEl.hidden = false;
  if (A.demo) ov.classList.add("is-demo");
  paintHeader();
  const boot = () => loadSession().then(() => {
    const lk = Q.get && Q.get("lk"), login = Q.get && Q.get("login");
    // возврат с VK ID / Яндекс ID (A1: 302 на ?login=ok|consent): согласие, если нужно, затем перенос корзины/избранного
    if (login && authed()) { openLK("home"); afterLogin({}); return; }
    if (lk || login) { const ok = SCREENS[lk] ? lk : null; openLK(ok || undefined); if (ok === "order" && Q.get("lkarg")) go("order", Q.get("lkarg"), true); }
  });
  if (isShot) setTimeout(boot, 0);
  else (W.requestIdleCallback || ((f) => setTimeout(f, 300)))(boot, { timeout: 1500 });

  GV.account = {
    v: 1, adapter: A.name, demo: A.demo,
    open: (s, a) => { openLK(s); if (a != null) go(s, a, true); return true; }, close: () => closeLK(true),
    get isOpen() { return openFlag; }, get authed() { return authed(); }, get user() { return S.user; },
    fav: { has: favHas, toggle: (id) => favToggle(id), list: () => favSet().slice() },
    restock: { add: (t) => restockAdd(t) },
    call: (n, p, b) => A.call(n, p, b)
  };
})();
