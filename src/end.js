/* GRINCHIN v4 · финал страницы (V3; основа K5 v3) → window.GV.end
   1) «Разобрали — вернём»: Telegram / почта, проверка, успех — zip-пакет и две ленты «прилепляются» крест-накрест,
      маскот subscribe реагирует сам (mascot.js, по grinchin:subscribe). Сетевых запросов нет. Шлёт grinchin:subscribe {channel: 'telegram'|'email'}.
   2) Подвал: ленивая бумага; заломы лого совмещены с фоном (лого «напечатано» на том же листе).
   3) 404 — разметка и маскот (mascot.js сам въезжает на grinchin:overlay {name:'404'}). */
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
  // новый логотип (logo_p1.svg): улыбка с рожками и буквы, 1649×447 — печать на пакете
  var LOGO_DATA={w:1649,h:447,smile:"M1635,226C1631,237 1628,247 1624,257C1611,292 1590,320 1561,344C1531,369 1496,385 1458,396C1425,404 1391,408 1357,408C1305,409 1254,405 1203,400C1159,395 1115,390 1070,390C1020,388 970,394 921,406C894,413 867,422 842,436C836,439 831,443 825,446C821,444 817,441 813,438C793,426 771,417 748,411C706,399 662,392 618,390C580,388 543,391 506,394C466,398 427,402 388,405C344,409 300,410 256,407C211,403 168,392 129,371C90,350 59,322 38,283C29,267 22,250 17,232C17,230 16,228 16,226C11,240 9,268 9,268C9,268 5,250 4,240C0,204 2,169 9,133C17,89 46,2 47,0C67,51 86,101 105,151C105,151 71,113 53,92C52,97 51,100 50,103C37,150 42,197 64,241C80,272 102,295 131,314C159,332 191,343 224,350C252,355 281,358 310,358C346,358 382,357 418,356C451,356 484,354 517,353C552,352 586,353 621,358C666,364 711,374 754,392C773,400 791,410 807,425C813,431 819,438 825,445C827,442 829,440 830,438C841,424 855,414 870,405C896,390 923,381 952,373C979,366 1007,360 1035,357C1068,354 1100,352 1133,353C1166,354 1199,355 1232,356C1277,358 1322,359 1367,356C1403,354 1438,349 1472,337C1503,326 1532,309 1555,284C1583,255 1600,219 1605,179C1609,152 1606,126 1599,100C1599,98 1598,96 1597,93C1579,112 1563,132 1546,152L1545,151L1603,0C1604,3 1604,4 1605,6C1619,46 1632,87 1640,129C1646,158 1649,186 1648,215C1647,232 1646,248 1642,264C1642,265 1641,267 1640,268C1639,254 1638,240 1635,226Z M1635,226",letters:"M633,65C633,65 713,150 752,194L744,194C748,202 776,236 788,246C788,229 786,213 785,197C784,180 783,164 782,147C780,131 779,115 778,98L833,120C835,204 839,287 844,372L763,310L768,305C738,265 678,182 678,182L684,337L628,302Z M633,65 M1484,69L1525,89L1522,287L1385,162C1385,162 1388,232 1389,267C1389,270 1390,273 1392,276C1392,278 1394,280 1395,281L1329,316C1330,302 1331,290 1332,278C1337,206 1340,135 1339,64C1339,58 1339,52 1339,46C1382,79 1413,115 1456,150L1447,150C1458,167 1469,182 1484,196Z M1484,69 M588,324L466,302L470,295L408,236C408,236 409,268 411,285L352,324C356,284 357,245 358,206C359,166 355,88 355,88C355,88 410,94 435,96C456,98 500,100 500,100L532,137L522,188L457,219Z M408,196C431,187 453,176 474,166C472,158 470,149 466,142L408,135Z M408,196 M246,314L189,286L175,296C154,263 135,230 115,196C118,188 122,179 126,171C132,157 138,142 144,128C145,126 146,124 148,122C164,105 181,88 198,72C199,70 201,68 204,68C244,54 285,42 326,29C327,28 329,28 331,28C331,34 328,107 328,107L270,128L282,108L195,138L163,181L222,251L279,202L238,188L336,149L334,244L311,221Z M246,314 M1002,147C1002,147 985,136 974,129C972,127 970,128 969,129C950,139 914,161 910,164C909,164 908,166 907,167C907,168 906,169 907,171C907,190 906,250 906,250L935,292L1001,266L981,247L1042,225C1042,225 1031,284 1026,313C989,324 951,331 916,348C910,340 903,332 897,325C885,309 872,294 860,278C859,276 859,274 859,272C858,261 858,251 858,240C857,222 856,204 856,186C856,183 856,180 857,178C863,158 876,120 876,120C876,120 986,61 987,60C1006,78 1040,117 1040,117L1034,145L994,160Z M1002,147 M1177,217C1154,222 1132,227 1110,234L1110,298C1110,298 1052,318 1052,318C1056,306 1056,294 1057,283C1060,241 1061,198 1060,156C1060,143 1058,114 1058,114L1117,104C1117,104 1113,121 1113,129C1112,147 1111,165 1111,183C1110,185 1111,186 1111,189L1176,171C1176,169 1176,167 1176,165C1176,145 1175,125 1174,106C1174,102 1173,98 1172,95C1172,93 1171,91 1170,88L1237,110C1230,121 1230,133 1230,145C1230,168 1229,190 1229,213C1230,240 1232,266 1234,293C1234,297 1236,301 1237,306C1216,305 1177,315 1177,315Z M1177,217 M600,97C600,97 602,242 607,314C600,309 558,275 558,275L554,113Z M600,97 M608,90L562,34C559,57 556,71 553,93L578,84Z M608,90 M1261,118C1276,112 1289,108 1306,102L1306,283L1256,310C1258,248 1259,179 1261,118Z M1261,118 M1316,96C1301,78 1286,59 1271,40C1267,63 1264,77 1261,99L1286,90Z M1316,96"};
  var LOGO = function () { return LOGO_DATA; };
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
  function showDone(ch) {
    var c = CH[ch];
    build();
    $("[data-nx-done-text]", done).textContent = c.done;
    form.hidden = true;
    done.hidden = false;
    var t = $("[data-nx-done-title]", done);
    t.focus({ preventScroll: true });
    if (instant() || !done.animate) return;
    var bag = $(".nx-bagg", done), txt = $(".nx-done-txt", done);
    if (bag) bag.animate([{ opacity: 0, transform: "scale(.97)" }, { opacity: 1, transform: "none" }],
      { duration: 300, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
    if (bag) { bag.style.transformBox = "fill-box"; bag.style.transformOrigin = "50% 50%"; }
    slap($(".nx-x", done), 260, -4);
    slap($(".nx-st", done), 620, 10);
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
