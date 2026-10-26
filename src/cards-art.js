/* GRINCHIN v4 — нарисованные вещи, галерея товара, «Образы», ленты. Владелец: V2 (v3 — K3).
   v4: ghost-фото поверх обложки ставит shop.js (.card-ghost); «Образы» — полароиды look-1..4 с мультяшным скотчем и стикерами. Глобально — только GV.art.

   Каталог: K1 после рендера карточки зовёт GV.art.render(cardEl, product, style) — арт ложится в .card-media
   первым слоем (запасные <img class="card-img"> K1 убираются). Если K1 не позвал (порядок скриптов, перерисовка
   сетки) — модуль сам дорисует все article.card[data-id] без арта (при загрузке и по MutationObserver на #drop).
   Стиль — ось data-cards на <html>: a техкарта · b маркер · c деталь · d техкарта + пометка от руки при наведении.

   Механика d: в покое — чистый флэт. Наведение (hover:hover) → маркером дописывается пометка (буквы проявляются
   слева направо, стрелка дорисовывается stroke-dashoffset, наконечник — в конце; ~0,6 с), появляется код вещи,
   вещь приподнимается на 4 px, под доступными размерами K1 ложится лаймовая плашка. Один раз за наведение
   (CSS-переходы). На тач-устройствах — один раз, когда карточка проходит центр экрана (IntersectionObserver).
   Вся вещь при появлении НЕ прорисовывается (R3 §4). reduced-motion и ?shot=1 — сразу конечное состояние.

   Галерея товара: GV.art.gallery(product, style) → [{type:'svg', html, alt}, …, {type:'img', src, alt}]:
     1 — рисунок в выбранном стиле (у d пометка дорисовывается один раз при показе кадра),
     2 — деталь крупно (лупа). Фото (product.photos) K1 ставит следом сам.
   GV.art.caption(product) → серая строка под галереей, пока фото нет («рисунки · фото после съёмки дропа») или "".
   «Образы»: ленты [data-stick] лепятся один раз при входе в экран, после grinchin:ready; счётчик свайпа;
   подписи a[data-product] синхронизируются с GV_PRODUCTS, клик открывает карточку товара (GV.open). */
(function () {
  "use strict";
  var root = document.documentElement;
  var GV = window.GV = window.GV || {};
  var mm = function (q) { return !!(window.matchMedia && matchMedia(q).matches); };
  var still = root.dataset.shot === "1" || mm("(prefers-reduced-motion: reduce)");
  var canHover = mm("(hover: hover) and (pointer: fine)");

/*<gen> — пишет src/img/_gen.py, руками не править */
var DATA = {"jeans-restart":{"callouts":[[162,148,"RESTART. — столбиком, от руки"],[175,348,"стрелка и «Let it B» по штанине"],[290,400,"широкая прямая, чёрный варёный"]],"note":{"x":301.7,"y":119.6,"w":89.6,"h":41.6,"arrow":"m336 163-1 7-1 6-1 7-1 7-2 6-2 7-2 6-2 7-3 7-3 6-3 7-3 6-4 6-4 6-4 6-4 6-4 6-5 5-4 5-5 6-5 5-4 4-5 5-5 5-5 4-5 3-5 4-5 4-7 3-6 4-7 3-6 2-6 2-6 2h-9l-8-1","tip":"M192 345L184 337L194 335","text":"ignore the signs"},"loupe":[131,223],"src":{"flat":"{{asset:img/jeans-restart-1.svg}}","b":"{{asset:img/art/jeans-restart-b.svg}}","c":"{{asset:img/art/jeans-restart-c.svg}}","detail":"{{asset:img/jeans-restart-2.svg}}","note":"{{asset:img/art/jeans-restart-n.svg}}"}},"suit-detour":{"callouts":[[131,122,"дуги-вставки: беж, лес, олива"],[264,206,"резинка по низу и на манжетах"],[168,339,"брюки комплектом, лампас-дуга"]],"note":{"x":296.3,"y":95.7,"w":82.8,"h":19.3,"arrow":"m328 117-2 7-4 5-6 4-7 2-8 1h-9l-8-2-9-3-8-3-8-4","tip":"M265 134L259 124L270 125","text":"в объезд"},"loupe":[206,204],"src":{"flat":"{{asset:img/suit-detour-1.svg}}","b":"{{asset:img/art/suit-detour-b.svg}}","c":"{{asset:img/art/suit-detour-c.svg}}","detail":"{{asset:img/suit-detour-2.svg}}","note":"{{asset:img/art/suit-detour-n.svg}}"}},"jeans-scribble":{"callouts":[[155,191,"каракули — вышивка нитью"],[245,308,"варка: двух одинаковых пар нет"],[290,407,"широкий, объём по бедру"]],"note":{"x":291.5,"y":118.9,"w":100.5,"h":43.3,"arrow":"m329 164-2 11-2 6-2 6-3 6-3 6-3 5-4 6-4 4-5 5-4 5-5 4-9 6-10 4-9 1-8-3","tip":"M262 246L256 236L267 236","text":"вышивка, не маркер"},"loupe":[131,272],"src":{"flat":"{{asset:img/jeans-scribble-1.svg}}","b":"{{asset:img/art/jeans-scribble-b.svg}}","c":"{{asset:img/art/jeans-scribble-c.svg}}","detail":"{{asset:img/jeans-scribble-2.svg}}","note":"{{asset:img/art/jeans-scribble-n.svg}}"}},"hoodie-crack":{"callouts":[[181,282,"трещины — принт по всей спине"],[243,248,"вафельное полотно, распыление"],[107,248,"чёрная вставка, спущенное плечо"]],"note":{"x":297.0,"y":149.3,"w":85.7,"h":24.6,"arrow":"m329 176-1 8-1 8-2 8-2 9-3 8-3 8-4 8-3 7-4 8-4 7-4 6-4 6-5 5-5 4-9 6-9 2-7-2","tip":"M264 292L258 282L269 283","text":"трещины"},"loupe":[157,337],"src":{"flat":"{{asset:img/hoodie-crack-1.svg}}","b":"{{asset:img/art/hoodie-crack-b.svg}}","c":"{{asset:img/art/hoodie-crack-c.svg}}","detail":"{{asset:img/hoodie-crack-2.svg}}","note":"{{asset:img/art/hoodie-crack-n.svg}}"}},"jacket-biker":{"callouts":[[200,159,"капюшон пришит"],[222,348,"две молнии, кнопки на лацканах"],[263,423,"ремень с металлической пряжкой"]],"note":{"x":283.8,"y":230.5,"w":108.2,"h":43.3,"arrow":"m324 276v7l-1 7-1 7-1 8-1 7-2 7-1 7-2 7-2 8-1 6-2 7-2 7-3 6-2 6-3 6-4 8-4 8-4 6-5 6-8 9-8 3-7-1","tip":"M266 428L260 418L271 419","text":"ремень с пряжкой"},"loupe":[190,300],"src":{"flat":"{{asset:img/jacket-biker-1.svg}}","b":"{{asset:img/art/jacket-biker-b.svg}}","c":"{{asset:img/art/jacket-biker-c.svg}}","detail":"{{asset:img/jacket-biker-2.svg}}","note":"{{asset:img/art/jacket-biker-n.svg}}"}},"jeans-redline":{"callouts":[[166,172,"крест строчкой на карманах"],[290,281,"красная строчка по всем швам"],[132,281,"бары у колена"]],"note":{"x":273.1,"y":127.0,"w":118.9,"h":41.3,"arrow":"m318 170-2 8-2 7-4 7-5 6-6 4-6 4-6 2-6 1-6-1-5-4","tip":"M274 214L270 204L281 206","text":"за линию — можно"},"loupe":[133,240],"src":{"flat":"{{asset:img/jeans-redline-1.svg}}","b":"{{asset:img/art/jeans-redline-b.svg}}","c":"{{asset:img/art/jeans-redline-c.svg}}","detail":"{{asset:img/jeans-redline-2.svg}}","note":"{{asset:img/art/jeans-redline-n.svg}}"}},"tee-blank":{"callouts":[[140,398,"жаккардовая G у подола"],[200,128,"рибана на горловине"],[286,317,"плотный хлопок, свободный крой"]],"note":{"x":283.0,"y":284.4,"w":84.9,"h":20.3,"arrow":"m315 307-2 7-1 7-5 7-5 7-4 4-5 5-4 5-6 4-6 4-5 5-7 4-7 4-6 4-7 3-7 3-8 3-7 3-7 2-8 3-7 1-7 2-8 2h-6l-7 1-7 1-7-1-6-1h-6","tip":"M155 403L147 396L157 393","text":"только G"},"loupe":[112,421],"src":{"flat":"{{asset:img/tee-blank-1.svg}}","b":"{{asset:img/art/tee-blank-b.svg}}","c":"{{asset:img/art/tee-blank-c.svg}}","detail":"{{asset:img/tee-blank-2.svg}}","note":"{{asset:img/art/tee-blank-n.svg}}"}},"longsleeve-blank":{"callouts":[[301,394,"длинная манжета в рубчик"],[142,398,"жаккардовая G у подола"],[200,128,"плотный хлопок"]],"note":{"x":297.9,"y":235.3,"w":94.1,"h":45.2,"arrow":"m334 283-1 8-1 9-2 8-1 9-1 8-1 9-2 8-1 8-2 7-2 7-1 7-2 6-3 10-4 6-3 3-4-2","tip":"M305 405L303 394L313 399","text":"манжета в рубчик"},"loupe":[113,421],"src":{"flat":"{{asset:img/longsleeve-blank-1.svg}}","b":"{{asset:img/art/longsleeve-blank-b.svg}}","c":"{{asset:img/art/longsleeve-blank-c.svg}}","detail":"{{asset:img/longsleeve-blank-2.svg}}","note":"{{asset:img/art/longsleeve-blank-n.svg}}"}}};
var TAG = {src:"{{asset:img/art/tag.svg}}", x:334, y:286, r:6, w:40, h:112};
/*</gen>*/
/*<raster> — пишет v4/build/V2/_tools/raster_art.py, руками не править */
var RASTER = {
"jeans-restart": {
"flat": {
"avif": "{{asset:img/v4/art/jeans-restart-flat-480.avif}} 480w, {{asset:img/v4/art/jeans-restart-flat-800.avif}} 800w, {{asset:img/v4/art/jeans-restart-flat-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/jeans-restart-flat-480.webp}} 480w, {{asset:img/v4/art/jeans-restart-flat-800.webp}} 800w, {{asset:img/v4/art/jeans-restart-flat-1200.webp}} 1200w"
},
"b": {
"avif": "{{asset:img/v4/art/jeans-restart-b-480.avif}} 480w, {{asset:img/v4/art/jeans-restart-b-800.avif}} 800w, {{asset:img/v4/art/jeans-restart-b-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/jeans-restart-b-480.webp}} 480w, {{asset:img/v4/art/jeans-restart-b-800.webp}} 800w, {{asset:img/v4/art/jeans-restart-b-1200.webp}} 1200w"
},
"c": {
"avif": "{{asset:img/v4/art/jeans-restart-c-480.avif}} 480w, {{asset:img/v4/art/jeans-restart-c-800.avif}} 800w, {{asset:img/v4/art/jeans-restart-c-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/jeans-restart-c-480.webp}} 480w, {{asset:img/v4/art/jeans-restart-c-800.webp}} 800w, {{asset:img/v4/art/jeans-restart-c-1200.webp}} 1200w"
}
},
"suit-detour": {
"flat": {
"avif": "{{asset:img/v4/art/suit-detour-flat-480.avif}} 480w, {{asset:img/v4/art/suit-detour-flat-800.avif}} 800w, {{asset:img/v4/art/suit-detour-flat-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/suit-detour-flat-480.webp}} 480w, {{asset:img/v4/art/suit-detour-flat-800.webp}} 800w, {{asset:img/v4/art/suit-detour-flat-1200.webp}} 1200w"
},
"b": {
"avif": "{{asset:img/v4/art/suit-detour-b-480.avif}} 480w, {{asset:img/v4/art/suit-detour-b-800.avif}} 800w, {{asset:img/v4/art/suit-detour-b-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/suit-detour-b-480.webp}} 480w, {{asset:img/v4/art/suit-detour-b-800.webp}} 800w, {{asset:img/v4/art/suit-detour-b-1200.webp}} 1200w"
},
"c": {
"avif": "{{asset:img/v4/art/suit-detour-c-480.avif}} 480w, {{asset:img/v4/art/suit-detour-c-800.avif}} 800w, {{asset:img/v4/art/suit-detour-c-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/suit-detour-c-480.webp}} 480w, {{asset:img/v4/art/suit-detour-c-800.webp}} 800w, {{asset:img/v4/art/suit-detour-c-1200.webp}} 1200w"
}
},
"jeans-scribble": {
"flat": {
"avif": "{{asset:img/v4/art/jeans-scribble-flat-480.avif}} 480w, {{asset:img/v4/art/jeans-scribble-flat-800.avif}} 800w, {{asset:img/v4/art/jeans-scribble-flat-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/jeans-scribble-flat-480.webp}} 480w, {{asset:img/v4/art/jeans-scribble-flat-800.webp}} 800w, {{asset:img/v4/art/jeans-scribble-flat-1200.webp}} 1200w"
},
"b": {
"avif": "{{asset:img/v4/art/jeans-scribble-b-480.avif}} 480w, {{asset:img/v4/art/jeans-scribble-b-800.avif}} 800w, {{asset:img/v4/art/jeans-scribble-b-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/jeans-scribble-b-480.webp}} 480w, {{asset:img/v4/art/jeans-scribble-b-800.webp}} 800w, {{asset:img/v4/art/jeans-scribble-b-1200.webp}} 1200w"
},
"c": {
"avif": "{{asset:img/v4/art/jeans-scribble-c-480.avif}} 480w, {{asset:img/v4/art/jeans-scribble-c-800.avif}} 800w, {{asset:img/v4/art/jeans-scribble-c-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/jeans-scribble-c-480.webp}} 480w, {{asset:img/v4/art/jeans-scribble-c-800.webp}} 800w, {{asset:img/v4/art/jeans-scribble-c-1200.webp}} 1200w"
}
},
"hoodie-crack": {
"flat": {
"avif": "{{asset:img/v4/art/hoodie-crack-flat-480.avif}} 480w, {{asset:img/v4/art/hoodie-crack-flat-800.avif}} 800w, {{asset:img/v4/art/hoodie-crack-flat-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/hoodie-crack-flat-480.webp}} 480w, {{asset:img/v4/art/hoodie-crack-flat-800.webp}} 800w, {{asset:img/v4/art/hoodie-crack-flat-1200.webp}} 1200w"
},
"b": {
"avif": "{{asset:img/v4/art/hoodie-crack-b-480.avif}} 480w, {{asset:img/v4/art/hoodie-crack-b-800.avif}} 800w, {{asset:img/v4/art/hoodie-crack-b-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/hoodie-crack-b-480.webp}} 480w, {{asset:img/v4/art/hoodie-crack-b-800.webp}} 800w, {{asset:img/v4/art/hoodie-crack-b-1200.webp}} 1200w"
},
"c": {
"avif": "{{asset:img/v4/art/hoodie-crack-c-480.avif}} 480w, {{asset:img/v4/art/hoodie-crack-c-800.avif}} 800w, {{asset:img/v4/art/hoodie-crack-c-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/hoodie-crack-c-480.webp}} 480w, {{asset:img/v4/art/hoodie-crack-c-800.webp}} 800w, {{asset:img/v4/art/hoodie-crack-c-1200.webp}} 1200w"
}
},
"jacket-biker": {
"flat": {
"avif": "{{asset:img/v4/art/jacket-biker-flat-480.avif}} 480w, {{asset:img/v4/art/jacket-biker-flat-800.avif}} 800w, {{asset:img/v4/art/jacket-biker-flat-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/jacket-biker-flat-480.webp}} 480w, {{asset:img/v4/art/jacket-biker-flat-800.webp}} 800w, {{asset:img/v4/art/jacket-biker-flat-1200.webp}} 1200w"
},
"b": {
"avif": "{{asset:img/v4/art/jacket-biker-b-480.avif}} 480w, {{asset:img/v4/art/jacket-biker-b-800.avif}} 800w, {{asset:img/v4/art/jacket-biker-b-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/jacket-biker-b-480.webp}} 480w, {{asset:img/v4/art/jacket-biker-b-800.webp}} 800w, {{asset:img/v4/art/jacket-biker-b-1200.webp}} 1200w"
},
"c": {
"avif": "{{asset:img/v4/art/jacket-biker-c-480.avif}} 480w, {{asset:img/v4/art/jacket-biker-c-800.avif}} 800w, {{asset:img/v4/art/jacket-biker-c-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/jacket-biker-c-480.webp}} 480w, {{asset:img/v4/art/jacket-biker-c-800.webp}} 800w, {{asset:img/v4/art/jacket-biker-c-1200.webp}} 1200w"
}
},
"jeans-redline": {
"flat": {
"avif": "{{asset:img/v4/art/jeans-redline-flat-480.avif}} 480w, {{asset:img/v4/art/jeans-redline-flat-800.avif}} 800w, {{asset:img/v4/art/jeans-redline-flat-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/jeans-redline-flat-480.webp}} 480w, {{asset:img/v4/art/jeans-redline-flat-800.webp}} 800w, {{asset:img/v4/art/jeans-redline-flat-1200.webp}} 1200w"
},
"b": {
"avif": "{{asset:img/v4/art/jeans-redline-b-480.avif}} 480w, {{asset:img/v4/art/jeans-redline-b-800.avif}} 800w, {{asset:img/v4/art/jeans-redline-b-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/jeans-redline-b-480.webp}} 480w, {{asset:img/v4/art/jeans-redline-b-800.webp}} 800w, {{asset:img/v4/art/jeans-redline-b-1200.webp}} 1200w"
},
"c": {
"avif": "{{asset:img/v4/art/jeans-redline-c-480.avif}} 480w, {{asset:img/v4/art/jeans-redline-c-800.avif}} 800w, {{asset:img/v4/art/jeans-redline-c-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/jeans-redline-c-480.webp}} 480w, {{asset:img/v4/art/jeans-redline-c-800.webp}} 800w, {{asset:img/v4/art/jeans-redline-c-1200.webp}} 1200w"
}
},
"tee-blank": {
"flat": {
"avif": "{{asset:img/v4/art/tee-blank-flat-480.avif}} 480w, {{asset:img/v4/art/tee-blank-flat-800.avif}} 800w, {{asset:img/v4/art/tee-blank-flat-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/tee-blank-flat-480.webp}} 480w, {{asset:img/v4/art/tee-blank-flat-800.webp}} 800w, {{asset:img/v4/art/tee-blank-flat-1200.webp}} 1200w"
},
"b": {
"avif": "{{asset:img/v4/art/tee-blank-b-480.avif}} 480w, {{asset:img/v4/art/tee-blank-b-800.avif}} 800w, {{asset:img/v4/art/tee-blank-b-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/tee-blank-b-480.webp}} 480w, {{asset:img/v4/art/tee-blank-b-800.webp}} 800w, {{asset:img/v4/art/tee-blank-b-1200.webp}} 1200w"
},
"c": {
"avif": "{{asset:img/v4/art/tee-blank-c-480.avif}} 480w, {{asset:img/v4/art/tee-blank-c-800.avif}} 800w, {{asset:img/v4/art/tee-blank-c-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/tee-blank-c-480.webp}} 480w, {{asset:img/v4/art/tee-blank-c-800.webp}} 800w, {{asset:img/v4/art/tee-blank-c-1200.webp}} 1200w"
}
},
"longsleeve-blank": {
"flat": {
"avif": "{{asset:img/v4/art/longsleeve-blank-flat-480.avif}} 480w, {{asset:img/v4/art/longsleeve-blank-flat-800.avif}} 800w, {{asset:img/v4/art/longsleeve-blank-flat-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/longsleeve-blank-flat-480.webp}} 480w, {{asset:img/v4/art/longsleeve-blank-flat-800.webp}} 800w, {{asset:img/v4/art/longsleeve-blank-flat-1200.webp}} 1200w"
},
"b": {
"avif": "{{asset:img/v4/art/longsleeve-blank-b-480.avif}} 480w, {{asset:img/v4/art/longsleeve-blank-b-800.avif}} 800w, {{asset:img/v4/art/longsleeve-blank-b-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/longsleeve-blank-b-480.webp}} 480w, {{asset:img/v4/art/longsleeve-blank-b-800.webp}} 800w, {{asset:img/v4/art/longsleeve-blank-b-1200.webp}} 1200w"
},
"c": {
"avif": "{{asset:img/v4/art/longsleeve-blank-c-480.avif}} 480w, {{asset:img/v4/art/longsleeve-blank-c-800.avif}} 800w, {{asset:img/v4/art/longsleeve-blank-c-1200.avif}} 1200w",
"webp": "{{asset:img/v4/art/longsleeve-blank-c-480.webp}} 480w, {{asset:img/v4/art/longsleeve-blank-c-800.webp}} 800w, {{asset:img/v4/art/longsleeve-blank-c-1200.webp}} 1200w"
}
}
};
/*</raster>*/

  var STYLES = { a: 1, b: 1, c: 1, d: 1 };
  function styleOf(s) { s = s || root.getAttribute("data-cards") || "d"; return STYLES[s] ? s : "d"; }
  function products() { return window.GV_PRODUCTS || []; }
  function byId(id) { var L = products(); for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function nameOf(p) { return p.name || ((p.type || "") + " " + (p.word || "")).trim(); }
  function codeOf(p) {
    if (p.sku) return p.sku;
    var n = p.n || (products().indexOf(p) + 1) || 1;
    return "GR-01-" + (n < 10 ? "0" : "") + n;
  }
  function pct(v, of) { return (v / of * 100).toFixed(2) + "%"; }

  /* ---------- слои арта ---------- */
  function noteLayer(d) {
    var n = d.note;
    return '<svg class="art-ov art-mark" viewBox="0 0 400 500" aria-hidden="true" focusable="false">' +
      '<path class="art-line art-halo" d="' + n.arrow + '" pathLength="1"/>' +
      '<path class="art-line art-ink" d="' + n.arrow + '" pathLength="1"/>' +
      '<path class="art-tip art-halo" d="' + n.tip + '"/><path class="art-tip art-ink" d="' + n.tip + '"/></svg>' +
      // буквы пометки: «дописываются» шторкой на transform (обёртка с overflow едет вправо, картинка — навстречу):
      // clip-path по картинке-SVG перерастрировал её каждый кадр (T3 v3.1: 50–100 мс растра на телефоне)
      '<span class="art-note art-mark" aria-hidden="true" ' +
      'style="left:' + pct(n.x, 400) + ";top:" + pct(n.y, 500) + ";width:" + pct(n.w, 400) + '">' +
      '<span class="art-note-c"><img src="' + d.src.note + '" alt="" decoding="async"></span></span>';
  }
  function codeLayer(p, style) {
    var c = esc(codeOf(p));
    if (style === "a") {
      return '<text class="art-code" x="20" y="27">' + c + "</text>" +
        '<text class="art-code" x="380" y="27" text-anchor="end">DROP 01</text>' +
        '<path class="art-hair" d="M20 35H380"/>';
    }
    return '<text class="art-code" x="20" y="27">' + c + "</text>";
  }
  function calloutLayer(d, ctx) {
    var out = "";
    d.callouts.forEach(function (c, i) {
      var x = c[0], y = c[1], left = x < 200, num = "0" + (i + 1);
      var bx = left ? 14 : 362, knee = left ? 38 : 362;
      out += '<g class="art-co">' +
        '<path class="art-co-line" d="M' + (left ? x - 3.5 : x + 3.5) + " " + y + "H" + knee + '"/>' +
        '<circle class="art-co-dot" cx="' + x + '" cy="' + y + '" r="3.5"/>' +
        '<rect class="art-co-box" x="' + bx + '" y="' + (y - 9) + '" width="24" height="17"/>' +
        '<text class="art-co-n" x="' + (bx + 12) + '" y="' + (y + 3.8) + '" text-anchor="middle">' + num + "</text></g>";
    });
    if (ctx === "gallery") {
      out += '<g class="art-legend">' + d.callouts.map(function (c, i) {
        return '<text x="20" y="' + (452 + i * 15) + '"><tspan class="art-legend-n">0' + (i + 1) + "</tspan>  " + esc(c[2]) + "</text>";
      }).join("") + "</g>";
    }
    return out;
  }
  function tagLayer() {
    return '<img class="art-tag" src="' + TAG.src + '" alt="" aria-hidden="true" decoding="async" style="left:' +
      pct(TAG.x, 400) + ";top:" + pct(TAG.y, 500) + ";width:" + pct(TAG.w, 400) + ";--tag-r:" + TAG.r + 'deg">';
  }

  /* v4: основа рисунка — растр (RASTER, avif/webp 480–1200w с альфой), SVG — запасной. Векторные SVG с градиентами под clip-path
     при первом показе растрились 300–900 мс на кадр (каталог, телефон CPU×4) — растр декодируется вне главного потока. */
  var SIZES = { card: "(max-width: 1099px) 46vw, 340px", gallery: "(max-width: 767px) 100vw, (max-width: 1119px) 52vw, 590px" };
  function baseHTML(p, style, ctx, src, alt) {
    var r = RASTER[p.id] && RASTER[p.id][style === "b" ? "b" : style === "c" ? "c" : "flat"];
    var lazy = ctx === "card" ? ' loading="lazy"' : "";
    if (!r) return '<img class="art-base" src="' + src + '" alt="' + esc(alt) + '" width="800" height="1000" decoding="async"' + lazy + ">";
    var sz = SIZES[ctx] || SIZES.card, fb = r.webp.split(/,\s*/)[1].replace(/\s+\d+w$/, "");
    return '<picture class="art-base"><source type="image/avif" srcset="' + r.avif + '" sizes="' + sz + '">' +
      '<img src="' + fb + '" srcset="' + r.webp + '" sizes="' + sz + '" alt="' + esc(alt) + '" width="800" height="1000" decoding="async"' + lazy + "></picture>";
  }

  /* html одного рисунка. ctx: card | gallery */
  function artHTML(p, style, ctx) {
    var d = DATA[p.id];
    if (!d) return "";
    style = styleOf(style);
    var src = style === "b" ? d.src.b : style === "c" ? d.src.c : d.src.flat;
    var alt = nameOf(p) + " — рисунок";
    var marked = ctx === "gallery" && style === "d" ? " is-marked" : "";
    var h = '<div class="art art--' + style + " art--" + ctx + marked + '" data-art="' + style + '">' + baseHTML(p, style, ctx, src, alt);
    h += '<svg class="art-ov art-meta" viewBox="0 0 400 500" aria-hidden="true" focusable="false">' +
      codeLayer(p, style) + (style === "a" ? calloutLayer(d, ctx) : "") + "</svg>";
    if (style === "b" || style === "d") h += noteLayer(d);
    if (style === "c") h += tagLayer();
    return h + "</div>";
  }

  /* ---------- каталог ---------- */
  var io = null;
  function touchMark(el) {          // тач: пометка один раз, когда карточка проходит центр экрана
    if (canHover || !("IntersectionObserver" in window)) return;
    if (!io) io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-marked"); io.unobserve(e.target);
      });
    }, { rootMargin: "-42% 0px -42% 0px", threshold: 0 });
    io.observe(el);
  }

  function render(cardEl, product, style) {
    if (!cardEl) return false;
    // v4.1: обложка «photo» — фото рисует shop.js, рисунок на карточку не кладём (в галерее он остаётся)
    if ((style || root.getAttribute("data-cards")) === "photo" && window.GV_PHOTOS && window.GV_PHOTOS[cardEl.getAttribute("data-id")]) return false;
    var p = product || byId(cardEl.getAttribute("data-id"));
    var media = cardEl.querySelector(".card-media");
    if (!p || !media || !DATA[p.id]) return false;
    style = styleOf(style);
    var old = media.querySelector(":scope > .art");
    if (old) old.remove();
    [].forEach.call(media.querySelectorAll(":scope > img.card-img, :scope > picture"), function (n) { n.remove(); });
    media.insertAdjacentHTML("afterbegin", artHTML(p, style, "card"));
    cardEl.setAttribute("data-art", style);
    var art = media.firstElementChild;
    if (style === "d") {
      if (still && !canHover) art.classList.add("is-marked");
      else touchMark(art);
    }
    return true;
  }

  function renderAll(force) {
    if (root.getAttribute("data-cards") === "photo") return;
    var st = styleOf();
    [].forEach.call(document.querySelectorAll("article.card[data-id]"), function (c) {
      if (!force && c.getAttribute("data-art") === st && c.querySelector(".card-media > .art")) return;
      render(c, null, st);
    });
  }

  /* ---------- галерея товара ---------- */
  function gallery(product, style) {
    var p = typeof product === "string" ? byId(product) : product;
    if (!p || !DATA[p.id]) return [];
    style = styleOf(style);
    var d = DATA[p.id], name = nameOf(p);
    var frames = [
      { type: "svg", html: artHTML(p, style, "gallery"), alt: name + " — рисунок" },
      { type: "svg", html: '<div class="art art--gallery art--detail"><img class="art-base" src="' + d.src.detail +
          '" alt="' + esc(name) + ' — деталь крупно, рисунок" width="800" height="1000" decoding="async"></div>',
        alt: name + " — деталь крупно, рисунок" }
    ];
    return frames;            // фото (product.photos) K1 добавляет сам следом за этими кадрами
  }
  function caption(product) {
    var p = typeof product === "string" ? byId(product) : product;
    if (!p) return "";
    // v4: есть фото «призрачный манекен» (GV_PHOTOS) — честная подпись о том, что это за кадры
    // v4.1: служебную подпись про демо-кадры покупателю не показываем (аудит) — кадры подписаны ярлыками сами
    if (window.GV_PHOTOS && window.GV_PHOTOS[p.id]) return "";
    return p.photos && p.photos.length ? "" : "рисунки · фото после съёмки дропа";
  }

  /* ---------- ленты: «прилепить» один раз ---------- */
  var ready = still, queue = [];
  function stick(el, opts) {
    opts = opts || {};
    if (el) el.classList.add("is-near");
    return new Promise(function (done) {
      if (!el || el.classList.contains("is-stuck")) return done();
      if (still || opts.instant) { el.classList.add("is-stuck"); return done(); }
      var go = function () {
        var t = 0;
        var fin = function () { clearTimeout(t); el.classList.remove("is-landing"); el.removeEventListener("animationend", onEnd); done(); };
        var onEnd = function (e) { if (e.target === el) fin(); };
        el.addEventListener("animationend", onEnd);
        el.classList.add("is-stuck", "is-landing");
        t = setTimeout(fin, 800);              // страховка: вкладка в фоне, animationend не пришёл
      };
      opts.delay ? setTimeout(go, opts.delay) : go();
    });
  }
  function flush() {
    if (!ready) return;
    queue.splice(0).forEach(function (el, i) { stick(el, { delay: i * 120 + 60 }); });
  }
  var near = null, seen = null;
  function watchTapes(scope) {
    var els = [].slice.call((scope || document).querySelectorAll(".tape:not([data-tape-seen])"))
      .filter(function (el) { return !el.closest(".lk-look"); });     // ленты «Образов» лепит looksDrop после посадки фото
    els.forEach(function (el) { el.setAttribute("data-tape-seen", ""); });
    if (!els.length) return;
    if (still || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-near"); stick(el, { instant: true }); });
      return;
    }
    near = near || new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-near"); near.unobserve(e.target); } });
    }, { rootMargin: "100% 0px 100% 0px" });
    seen = seen || new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        seen.unobserve(e.target); queue.push(e.target);
      });
      flush();
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0 });
    els.forEach(function (el) {
      near.observe(el);
      if (el.hasAttribute("data-stick")) seen.observe(el); else el.classList.add("is-stuck");
    });
  }
  document.addEventListener("grinchin:ready", function () { ready = true; flush(); });
  setTimeout(function () { if (!ready) { ready = true; flush(); } }, 6000);   // ready не пришёл — ленты не держим

  /* ---------- «Образы» ---------- */
  function syncNames() {
    [].forEach.call(document.querySelectorAll("#looks a[data-product]"), function (a) {
      var p = byId(a.getAttribute("data-product"));
      if (p && nameOf(p)) a.textContent = nameOf(p);
    });
  }
  function looksCounter() {
    var rail = document.querySelector("[data-lk-rail]"), out = document.querySelector("[data-lk-now]");
    if (!rail || !out) return;
    var looks = rail.querySelectorAll(".lk-look"), raf = 0;
    var upd = function () {
      raf = 0;
      var x = rail.getBoundingClientRect().left + (parseFloat(getComputedStyle(rail).scrollPaddingLeft) || 0), best = 0, dd = 1e9;
      for (var i = 0; i < looks.length; i++) {
        var v = Math.abs(looks[i].getBoundingClientRect().left - x);
        if (v < dd) { dd = v; best = i; }
      }
      if (out.textContent !== String(best + 1)) out.textContent = best + 1;
    };
    rail.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
  }
  /* отпечаток падает на стену (transform/opacity, один раз), лента «шлёпает» после посадки */
  /* фото образов: data-srcset → srcset при подходе к блоку (за ~1 экран), не раньше */
  function looksLoad(lk) {
    [].forEach.call(lk.querySelectorAll(".lk-photo [data-srcset]"), function (el) {
      el.setAttribute("srcset", el.getAttribute("data-srcset")); el.removeAttribute("data-srcset");
      if (el.hasAttribute("data-src")) { el.setAttribute("src", el.getAttribute("data-src")); el.removeAttribute("data-src"); }
    });
  }
  function looksDrop() {
    var looks = [].slice.call(document.querySelectorAll("#looks .lk-look"));
    if (!looks.length) return;
    if (!("IntersectionObserver" in window)) looks.forEach(looksLoad);
    else {
      var ldIO = new IntersectionObserver(function (es) {
        // блок подошёл — грузим все четыре: на телефоне 3-й и 4-й спрятаны в ленте-свайпе (её обрезка не знает rootMargin)
        if (es.some(function (e) { return e.isIntersecting; })) { ldIO.disconnect(); looks.forEach(looksLoad); }
      }, { rootMargin: "100% 100% 100% 100%" });
      looks.forEach(function (lk) { ldIO.observe(lk); });
    }
    // v4: стикеры шлёпаются после скотча (видимые по оси data-stickers; скрытые display:none — их не трогаем)
    var stickers = function (lk, now) {
      [].forEach.call(lk.querySelectorAll(".lk-stk"), function (s, k) {
        if (!s.getClientRects().length) return;
        if (now) { s.classList.add("is-stuck"); return; }
        setTimeout(function () {
          s.classList.add("is-stuck", "is-landing");
          setTimeout(function () { s.classList.remove("is-landing"); }, 520);
        }, 260 + k * 160);
      });
    };
    var land = function (lk, i) {
      var tape = lk.querySelector(".tape");
      if (tape) tape.classList.add("is-near");
      if (still) { lk.classList.add("is-in"); if (tape) stick(tape, { instant: true }); stickers(lk, true); return; }
      setTimeout(function () {
        lk.classList.add("is-in");
        if (tape) setTimeout(function () { stick(tape).then(function () { stickers(lk); }); }, 380);
        else setTimeout(function () { stickers(lk); }, 380);
      }, i * 140);
    };
    if (still || !("IntersectionObserver" in window)) { looks.forEach(function (lk) { land(lk, 0); }); return; }
    var pending = [];
    var go = function () { if (!ready) return; pending.splice(0).forEach(land); };
    var nearIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        nearIO.unobserve(e.target);
        var t = e.target.querySelector(".tape"); if (t) t.classList.add("is-near");
      });
    }, { rootMargin: "100% 100% 100% 100%" });
    var inIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { inIO.unobserve(e.target); pending.push(e.target); } });
      go();
    }, { rootMargin: "0px 0px -15% 0px", threshold: .15 });
    looks.forEach(function (lk) { nearIO.observe(lk); inIO.observe(lk); });
    document.addEventListener("grinchin:ready", go);
    setTimeout(go, 6100);
  }

  /* клик по вещи в подписи образа: карточка товара, если K1 её даёт; иначе — якорь #drop */
  function looksLinks() {
    var sec = document.getElementById("looks");
    if (!sec) return;
    sec.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[data-product]");
      if (!a || typeof GV.open !== "function" || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      GV.open("product", a.getAttribute("data-product"));
    });
  }

  /* ---------- запуск ---------- */
  function init() {
    renderAll(false);
    var drop = document.getElementById("drop");
    if (drop && "MutationObserver" in window) {
      var t = 0;
      new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { renderAll(false); }, 0); })
        .observe(drop, { childList: true, subtree: true });
    }
    syncNames(); looksCounter(); looksLinks(); looksDrop(); watchTapes();
    if (GV.mode && typeof GV.mode.live === "function") { try { GV.mode.live("cards"); } catch (e) {} }
  }
  document.addEventListener("grinchin:mode", function (e) {
    if (e.detail && e.detail.axis === "cards") renderAll(true);
  });

  GV.art = {
    render: render,
    renderAll: function () { renderAll(true); },
    gallery: gallery,
    caption: caption,
    html: function (p, style, ctx) { p = typeof p === "string" ? byId(p) : p; return p ? artHTML(p, style, ctx || "gallery") : ""; },
    style: function () { return styleOf(); },
    styles: ["a", "b", "c", "d"],
    stick: stick,
    watchTapes: watchTapes,
    data: DATA
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
