/* GRINCHIN v4 — данные дропа 01. Владелец: V2 (v3 — K1).
   v4: фото вещей «призрачный манекен» — window.GV_PHOTOS[id] = {front|back|side: {avif, webp}} (srcset 480–1200w, кадр 4:5),
   образы на модели — window.GV_LOOK_PHOTOS[n]; 3D-модель вещи на вешалке есть, если p.d3 (рисует S1: GV.rack.mountProduct).
   Цены, размеры, наличие, составы и даты — ПРИМЕР (example:true), до решения владельцев.
   Имена и тексты — copy deck v2 (v2/audit/05 §4.3–4.4): ТИП + СЛОВО, цвет — [в скобках].
   id не менялись с v1 (на них ссылаются соседи: looks.html → a[data-product="…"], GV.art по p.id).
   img — эскизы-фолбэк (src/img/<id>-1.svg вещь, -2.svg деталь), файлами (маркер asset), не base64.
   Нарисованную обложку и галерею даёт K3: GV.art.render(card, p, style) / GV.art.gallery(p, style). */
window.GV_DROP = {
  name: "Дроп 01",
  total: 8,
  shipFrom: "01.12",          // пример
  preorderTill: "30.11",      // пример
  maxQty: 3,                  // «Больше 3 в одни руки — нет.»
  example: true
};

/* state: preorder — можно купить, отправка с shipFrom; soldout — разобрали.
   Остаток 1 у размера → на карточке «L — ПОСЛЕДНИЙ» (считается из sizes, руками не пишется). */
window.GV_PRODUCTS = [
  {
    id: "jeans-restart", n: 1, type: "Джинсы", word: "RESTART", color: "ЧЁРНЫЙ / КРАСНЫЙ",
    price: 8900, state: "preorder",
    sizes: { S: 3, M: 6, L: 0, XL: 4, XXL: 2 },
    desc: "Широкие чёрные джинсы. Красный принт от руки: RESTART, Let it B, стрелки.",
    fit: "свободная", model: "187 см, носит L",
    composition: "100% хлопок, деним 13 oz", care: "Стирка 30°, наизнанку, без отбеливания",
    pairs: ["hoodie-crack", "tee-blank"],
    img: ["{{asset:img/jeans-restart-1.svg}}", "{{asset:img/jeans-restart-2.svg}}"],
    example: true
  },
  {
    id: "suit-detour", n: 2, type: "Костюм", word: "ОБЪЕЗД", color: "БЕЖ / ЛЕС / ОЛИВА",
    price: 16900, state: "preorder",
    sizes: { S: 2, M: 5, L: 5, XL: 3, XXL: 0 },
    desc: "Ветровка на молнии и широкие брюки. Продаётся комплектом.",
    fit: "оверсайз", model: "187 см, носит L",
    composition: "100% полиэстер, подкладка — сетка", care: "Стирка 30°, деликатный режим, не гладить вставки",
    pairs: ["tee-blank", "longsleeve-blank"],
    img: ["{{asset:img/suit-detour-1.svg}}", "{{asset:img/suit-detour-2.svg}}"],
    example: true
  },
  {
    id: "jeans-scribble", n: 3, type: "Джинсы", word: "КАРАКУЛИ", color: "СЕРЫЙ ВАРЁНЫЙ",
    price: 9500, state: "preorder",
    sizes: { S: 0, M: 4, L: 6, XL: 4, XXL: 2 },
    desc: "Серый варёный деним, красная вышивка от пояса до подгиба.",
    fit: "свободная", model: "187 см, носит L",
    composition: "100% хлопок, деним 12 oz", care: "Стирка 30°, наизнанку, отдельно от светлого",
    pairs: ["hoodie-crack", "tee-blank"],
    img: ["{{asset:img/jeans-scribble-1.svg}}", "{{asset:img/jeans-scribble-2.svg}}"],
    example: true
  },
  {
    id: "hoodie-crack", n: 4, type: "Худи", word: "ТРЕЩИНА", color: "ГРАФИТ",
    price: 7500, state: "preorder",
    sizes: { S: 4, M: 8, L: 1, XL: 5, XXL: 3 },
    desc: "Варёное худи, трещины принтом по спине. Капюшон двойной.",
    fit: "оверсайз", model: "187 см, носит L",
    composition: "80% хлопок, 20% полиэстер, 380 г/м²", care: "Стирка 30°, наизнанку, сушить разложенным",
    pairs: ["jeans-restart", "jeans-scribble"],
    img: ["{{asset:img/hoodie-crack-1.svg}}", "{{asset:img/hoodie-crack-2.svg}}"],
    example: true
  },
  {
    id: "jacket-biker", n: 5, type: "Косуха", word: "КАПЮШОН", color: "ГРАФИТ ВАРЁНЫЙ",
    price: 14900, state: "preorder",
    sizes: { S: 2, M: 3, L: 4, XL: 0, XXL: 0 },
    desc: "Косуха из варёного хлопка, капюшон пришит.",
    fit: "свободная", model: "187 см, носит L",
    composition: "100% хлопок, канвас с варкой", care: "Деликатная стирка 30°, без сушильной машины",
    pairs: ["jeans-redline", "tee-blank"],
    img: ["{{asset:img/jacket-biker-1.svg}}", "{{asset:img/jacket-biker-2.svg}}"],
    example: true
  },
  {
    id: "jeans-redline", n: 6, type: "Джинсы", word: "КРАСНАЯ ЛИНИЯ", color: "ИНДИГО",
    price: 8500, state: "preorder",
    sizes: { S: 2, M: 5, L: 5, XL: 3, XXL: 2 },
    desc: "Тёмный деним, красная строчка по всем швам. Длина в пол.",
    fit: "свободная", model: "187 см, носит L",
    composition: "100% хлопок, деним 13 oz", care: "Стирка 30°, наизнанку",
    pairs: ["jacket-biker", "longsleeve-blank"],
    img: ["{{asset:img/jeans-redline-1.svg}}", "{{asset:img/jeans-redline-2.svg}}"],
    example: true
  },
  {
    id: "tee-blank", n: 7, type: "Футболка", word: "ФОН", color: "БЕЛЫЙ",
    price: 3900, state: "preorder",
    sizes: { S: 6, M: 9, L: 9, XL: 6, XXL: 4 },
    desc: "Плотная белая футболка. Жаккардовая G у подола.",
    fit: "свободная", model: "187 см, носит L",
    composition: "100% хлопок, 240 г/м²", care: "Стирка 40°, гладить с изнанки",
    pairs: ["jeans-restart", "suit-detour"],
    img: ["{{asset:img/tee-blank-1.svg}}", "{{asset:img/tee-blank-2.svg}}"],
    example: true
  },
  {
    id: "longsleeve-blank", n: 8, type: "Лонгслив", word: "ФОН", color: "БЕЛЫЙ",
    price: 4500, state: "soldout",
    sizes: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
    desc: "Белый лонгслив, длинная манжета в рубчик. G у подола.",
    fit: "свободная", model: "187 см, носит L",
    composition: "100% хлопок, 220 г/м²", care: "Стирка 40°, гладить с изнанки",
    pairs: ["jeans-redline", "jeans-scribble"],
    img: ["{{asset:img/longsleeve-blank-1.svg}}", "{{asset:img/longsleeve-blank-2.svg}}"],
    example: true
  }
];
window.GV_PRODUCTS.forEach(function (p) { p.name = p.type + " " + p.word; p.d3 = true; }); // 3D-модели есть у всех восьми (hf/3d/manifest.json; костюм — верх+низ)

/* Образы v4 — lookbook-кадры Higgsfield (hf/scenes/final/look-1..4, 4:5), вёрстка — looks.html (V2).
   Карточка товара показывает кадр «на модели» и ссылку «Из образа ’NN» по первому образу, где вещь есть (у футболки образа нет). */
window.GV_LOOKS = [
  { n: "01", items: ["hoodie-crack", "jeans-scribble"], alt: "Худи ТРЕЩИНА и джинсы КАРАКУЛИ на модели, ночная улица" },
  { n: "02", items: ["suit-detour"], alt: "Костюм ОБЪЕЗД на модели: ветровка и широкие брюки, ночная улица" },
  { n: "03", items: ["jacket-biker", "jeans-restart"], alt: "Косуха КАПЮШОН и джинсы RESTART на модели, ночная улица" },
  { n: "04", items: ["longsleeve-blank", "jeans-redline"], alt: "Лонгслив ФОН и джинсы КРАСНАЯ ЛИНИЯ на модели, ночная улица" }
];

/*<photos> — пишет v4/build/V2/_tools/gen_photos.py, руками не править */
window.GV_PHOTOS = {
"jeans-restart": {
"front": {
"avif": "{{asset:img/v4/products/jeans-restart-front-480.avif}} 480w, {{asset:img/v4/products/jeans-restart-front-640.avif}} 640w, {{asset:img/v4/products/jeans-restart-front-800.avif}} 800w, {{asset:img/v4/products/jeans-restart-front-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/jeans-restart-front-480.webp}} 480w, {{asset:img/v4/products/jeans-restart-front-640.webp}} 640w, {{asset:img/v4/products/jeans-restart-front-800.webp}} 800w, {{asset:img/v4/products/jeans-restart-front-1200.webp}} 1200w"
},
"back": {
"avif": "{{asset:img/v4/products/jeans-restart-back-480.avif}} 480w, {{asset:img/v4/products/jeans-restart-back-640.avif}} 640w, {{asset:img/v4/products/jeans-restart-back-800.avif}} 800w, {{asset:img/v4/products/jeans-restart-back-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/jeans-restart-back-480.webp}} 480w, {{asset:img/v4/products/jeans-restart-back-640.webp}} 640w, {{asset:img/v4/products/jeans-restart-back-800.webp}} 800w, {{asset:img/v4/products/jeans-restart-back-1200.webp}} 1200w"
},
"side": {
"avif": "{{asset:img/v4/products/jeans-restart-side-480.avif}} 480w, {{asset:img/v4/products/jeans-restart-side-640.avif}} 640w, {{asset:img/v4/products/jeans-restart-side-800.avif}} 800w, {{asset:img/v4/products/jeans-restart-side-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/jeans-restart-side-480.webp}} 480w, {{asset:img/v4/products/jeans-restart-side-640.webp}} 640w, {{asset:img/v4/products/jeans-restart-side-800.webp}} 800w, {{asset:img/v4/products/jeans-restart-side-1200.webp}} 1200w"
}
},
"suit-detour": {
"front": {
"avif": "{{asset:img/v4/products/suit-detour-front-480.avif}} 480w, {{asset:img/v4/products/suit-detour-front-640.avif}} 640w, {{asset:img/v4/products/suit-detour-front-800.avif}} 800w, {{asset:img/v4/products/suit-detour-front-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/suit-detour-front-480.webp}} 480w, {{asset:img/v4/products/suit-detour-front-640.webp}} 640w, {{asset:img/v4/products/suit-detour-front-800.webp}} 800w, {{asset:img/v4/products/suit-detour-front-1200.webp}} 1200w"
},
"back": {
"avif": "{{asset:img/v4/products/suit-detour-back-480.avif}} 480w, {{asset:img/v4/products/suit-detour-back-640.avif}} 640w, {{asset:img/v4/products/suit-detour-back-800.avif}} 800w, {{asset:img/v4/products/suit-detour-back-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/suit-detour-back-480.webp}} 480w, {{asset:img/v4/products/suit-detour-back-640.webp}} 640w, {{asset:img/v4/products/suit-detour-back-800.webp}} 800w, {{asset:img/v4/products/suit-detour-back-1200.webp}} 1200w"
},
"side": {
"avif": "{{asset:img/v4/products/suit-detour-side-480.avif}} 480w, {{asset:img/v4/products/suit-detour-side-640.avif}} 640w, {{asset:img/v4/products/suit-detour-side-800.avif}} 800w, {{asset:img/v4/products/suit-detour-side-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/suit-detour-side-480.webp}} 480w, {{asset:img/v4/products/suit-detour-side-640.webp}} 640w, {{asset:img/v4/products/suit-detour-side-800.webp}} 800w, {{asset:img/v4/products/suit-detour-side-1200.webp}} 1200w"
}
},
"jeans-scribble": {
"front": {
"avif": "{{asset:img/v4/products/jeans-scribble-front-480.avif}} 480w, {{asset:img/v4/products/jeans-scribble-front-640.avif}} 640w, {{asset:img/v4/products/jeans-scribble-front-800.avif}} 800w, {{asset:img/v4/products/jeans-scribble-front-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/jeans-scribble-front-480.webp}} 480w, {{asset:img/v4/products/jeans-scribble-front-640.webp}} 640w, {{asset:img/v4/products/jeans-scribble-front-800.webp}} 800w, {{asset:img/v4/products/jeans-scribble-front-1200.webp}} 1200w"
},
"back": {
"avif": "{{asset:img/v4/products/jeans-scribble-back-480.avif}} 480w, {{asset:img/v4/products/jeans-scribble-back-640.avif}} 640w, {{asset:img/v4/products/jeans-scribble-back-800.avif}} 800w, {{asset:img/v4/products/jeans-scribble-back-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/jeans-scribble-back-480.webp}} 480w, {{asset:img/v4/products/jeans-scribble-back-640.webp}} 640w, {{asset:img/v4/products/jeans-scribble-back-800.webp}} 800w, {{asset:img/v4/products/jeans-scribble-back-1200.webp}} 1200w"
},
"side": {
"avif": "{{asset:img/v4/products/jeans-scribble-side-480.avif}} 480w, {{asset:img/v4/products/jeans-scribble-side-640.avif}} 640w, {{asset:img/v4/products/jeans-scribble-side-800.avif}} 800w, {{asset:img/v4/products/jeans-scribble-side-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/jeans-scribble-side-480.webp}} 480w, {{asset:img/v4/products/jeans-scribble-side-640.webp}} 640w, {{asset:img/v4/products/jeans-scribble-side-800.webp}} 800w, {{asset:img/v4/products/jeans-scribble-side-1200.webp}} 1200w"
}
},
"hoodie-crack": {
"front": {
"avif": "{{asset:img/v4/products/hoodie-crack-front-480.avif}} 480w, {{asset:img/v4/products/hoodie-crack-front-640.avif}} 640w, {{asset:img/v4/products/hoodie-crack-front-800.avif}} 800w, {{asset:img/v4/products/hoodie-crack-front-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/hoodie-crack-front-480.webp}} 480w, {{asset:img/v4/products/hoodie-crack-front-640.webp}} 640w, {{asset:img/v4/products/hoodie-crack-front-800.webp}} 800w, {{asset:img/v4/products/hoodie-crack-front-1200.webp}} 1200w"
},
"back": {
"avif": "{{asset:img/v4/products/hoodie-crack-back-480.avif}} 480w, {{asset:img/v4/products/hoodie-crack-back-640.avif}} 640w, {{asset:img/v4/products/hoodie-crack-back-800.avif}} 800w, {{asset:img/v4/products/hoodie-crack-back-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/hoodie-crack-back-480.webp}} 480w, {{asset:img/v4/products/hoodie-crack-back-640.webp}} 640w, {{asset:img/v4/products/hoodie-crack-back-800.webp}} 800w, {{asset:img/v4/products/hoodie-crack-back-1200.webp}} 1200w"
},
"side": {
"avif": "{{asset:img/v4/products/hoodie-crack-side-480.avif}} 480w, {{asset:img/v4/products/hoodie-crack-side-640.avif}} 640w, {{asset:img/v4/products/hoodie-crack-side-800.avif}} 800w, {{asset:img/v4/products/hoodie-crack-side-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/hoodie-crack-side-480.webp}} 480w, {{asset:img/v4/products/hoodie-crack-side-640.webp}} 640w, {{asset:img/v4/products/hoodie-crack-side-800.webp}} 800w, {{asset:img/v4/products/hoodie-crack-side-1200.webp}} 1200w"
}
},
"jacket-biker": {
"front": {
"avif": "{{asset:img/v4/products/jacket-biker-front-480.avif}} 480w, {{asset:img/v4/products/jacket-biker-front-640.avif}} 640w, {{asset:img/v4/products/jacket-biker-front-800.avif}} 800w, {{asset:img/v4/products/jacket-biker-front-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/jacket-biker-front-480.webp}} 480w, {{asset:img/v4/products/jacket-biker-front-640.webp}} 640w, {{asset:img/v4/products/jacket-biker-front-800.webp}} 800w, {{asset:img/v4/products/jacket-biker-front-1200.webp}} 1200w"
},
"back": {
"avif": "{{asset:img/v4/products/jacket-biker-back-480.avif}} 480w, {{asset:img/v4/products/jacket-biker-back-640.avif}} 640w, {{asset:img/v4/products/jacket-biker-back-800.avif}} 800w, {{asset:img/v4/products/jacket-biker-back-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/jacket-biker-back-480.webp}} 480w, {{asset:img/v4/products/jacket-biker-back-640.webp}} 640w, {{asset:img/v4/products/jacket-biker-back-800.webp}} 800w, {{asset:img/v4/products/jacket-biker-back-1200.webp}} 1200w"
},
"side": {
"avif": "{{asset:img/v4/products/jacket-biker-side-480.avif}} 480w, {{asset:img/v4/products/jacket-biker-side-640.avif}} 640w, {{asset:img/v4/products/jacket-biker-side-800.avif}} 800w, {{asset:img/v4/products/jacket-biker-side-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/jacket-biker-side-480.webp}} 480w, {{asset:img/v4/products/jacket-biker-side-640.webp}} 640w, {{asset:img/v4/products/jacket-biker-side-800.webp}} 800w, {{asset:img/v4/products/jacket-biker-side-1200.webp}} 1200w"
}
},
"jeans-redline": {
"front": {
"avif": "{{asset:img/v4/products/jeans-redline-front-480.avif}} 480w, {{asset:img/v4/products/jeans-redline-front-640.avif}} 640w, {{asset:img/v4/products/jeans-redline-front-800.avif}} 800w, {{asset:img/v4/products/jeans-redline-front-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/jeans-redline-front-480.webp}} 480w, {{asset:img/v4/products/jeans-redline-front-640.webp}} 640w, {{asset:img/v4/products/jeans-redline-front-800.webp}} 800w, {{asset:img/v4/products/jeans-redline-front-1200.webp}} 1200w"
},
"back": {
"avif": "{{asset:img/v4/products/jeans-redline-back-480.avif}} 480w, {{asset:img/v4/products/jeans-redline-back-640.avif}} 640w, {{asset:img/v4/products/jeans-redline-back-800.avif}} 800w, {{asset:img/v4/products/jeans-redline-back-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/jeans-redline-back-480.webp}} 480w, {{asset:img/v4/products/jeans-redline-back-640.webp}} 640w, {{asset:img/v4/products/jeans-redline-back-800.webp}} 800w, {{asset:img/v4/products/jeans-redline-back-1200.webp}} 1200w"
},
"side": {
"avif": "{{asset:img/v4/products/jeans-redline-side-480.avif}} 480w, {{asset:img/v4/products/jeans-redline-side-640.avif}} 640w, {{asset:img/v4/products/jeans-redline-side-800.avif}} 800w, {{asset:img/v4/products/jeans-redline-side-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/jeans-redline-side-480.webp}} 480w, {{asset:img/v4/products/jeans-redline-side-640.webp}} 640w, {{asset:img/v4/products/jeans-redline-side-800.webp}} 800w, {{asset:img/v4/products/jeans-redline-side-1200.webp}} 1200w"
}
},
"tee-blank": {
"front": {
"avif": "{{asset:img/v4/products/tee-blank-front-480.avif}} 480w, {{asset:img/v4/products/tee-blank-front-640.avif}} 640w, {{asset:img/v4/products/tee-blank-front-800.avif}} 800w, {{asset:img/v4/products/tee-blank-front-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/tee-blank-front-480.webp}} 480w, {{asset:img/v4/products/tee-blank-front-640.webp}} 640w, {{asset:img/v4/products/tee-blank-front-800.webp}} 800w, {{asset:img/v4/products/tee-blank-front-1200.webp}} 1200w"
},
"back": {
"avif": "{{asset:img/v4/products/tee-blank-back-480.avif}} 480w, {{asset:img/v4/products/tee-blank-back-640.avif}} 640w, {{asset:img/v4/products/tee-blank-back-800.avif}} 800w, {{asset:img/v4/products/tee-blank-back-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/tee-blank-back-480.webp}} 480w, {{asset:img/v4/products/tee-blank-back-640.webp}} 640w, {{asset:img/v4/products/tee-blank-back-800.webp}} 800w, {{asset:img/v4/products/tee-blank-back-1200.webp}} 1200w"
},
"side": {
"avif": "{{asset:img/v4/products/tee-blank-side-480.avif}} 480w, {{asset:img/v4/products/tee-blank-side-640.avif}} 640w, {{asset:img/v4/products/tee-blank-side-800.avif}} 800w, {{asset:img/v4/products/tee-blank-side-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/tee-blank-side-480.webp}} 480w, {{asset:img/v4/products/tee-blank-side-640.webp}} 640w, {{asset:img/v4/products/tee-blank-side-800.webp}} 800w, {{asset:img/v4/products/tee-blank-side-1200.webp}} 1200w"
}
},
"longsleeve-blank": {
"front": {
"avif": "{{asset:img/v4/products/longsleeve-blank-front-480.avif}} 480w, {{asset:img/v4/products/longsleeve-blank-front-640.avif}} 640w, {{asset:img/v4/products/longsleeve-blank-front-800.avif}} 800w, {{asset:img/v4/products/longsleeve-blank-front-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/longsleeve-blank-front-480.webp}} 480w, {{asset:img/v4/products/longsleeve-blank-front-640.webp}} 640w, {{asset:img/v4/products/longsleeve-blank-front-800.webp}} 800w, {{asset:img/v4/products/longsleeve-blank-front-1200.webp}} 1200w"
},
"back": {
"avif": "{{asset:img/v4/products/longsleeve-blank-back-480.avif}} 480w, {{asset:img/v4/products/longsleeve-blank-back-640.avif}} 640w, {{asset:img/v4/products/longsleeve-blank-back-800.avif}} 800w, {{asset:img/v4/products/longsleeve-blank-back-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/longsleeve-blank-back-480.webp}} 480w, {{asset:img/v4/products/longsleeve-blank-back-640.webp}} 640w, {{asset:img/v4/products/longsleeve-blank-back-800.webp}} 800w, {{asset:img/v4/products/longsleeve-blank-back-1200.webp}} 1200w"
},
"side": {
"avif": "{{asset:img/v4/products/longsleeve-blank-side-480.avif}} 480w, {{asset:img/v4/products/longsleeve-blank-side-640.avif}} 640w, {{asset:img/v4/products/longsleeve-blank-side-800.avif}} 800w, {{asset:img/v4/products/longsleeve-blank-side-1200.avif}} 1200w",
"webp": "{{asset:img/v4/products/longsleeve-blank-side-480.webp}} 480w, {{asset:img/v4/products/longsleeve-blank-side-640.webp}} 640w, {{asset:img/v4/products/longsleeve-blank-side-800.webp}} 800w, {{asset:img/v4/products/longsleeve-blank-side-1200.webp}} 1200w"
}
}
};
window.GV_LOOK_PHOTOS = {
"01": {
"avif": "{{asset:img/v4/looks/look-1-hoodie-karakuli-640.avif}} 640w, {{asset:img/v4/looks/look-1-hoodie-karakuli-900.avif}} 900w, {{asset:img/v4/looks/look-1-hoodie-karakuli-1200.avif}} 1200w",
"webp": "{{asset:img/v4/looks/look-1-hoodie-karakuli-640.webp}} 640w, {{asset:img/v4/looks/look-1-hoodie-karakuli-900.webp}} 900w, {{asset:img/v4/looks/look-1-hoodie-karakuli-1200.webp}} 1200w"
},
"02": {
"avif": "{{asset:img/v4/looks/look-2-suit-obezd-640.avif}} 640w, {{asset:img/v4/looks/look-2-suit-obezd-900.avif}} 900w, {{asset:img/v4/looks/look-2-suit-obezd-1200.avif}} 1200w",
"webp": "{{asset:img/v4/looks/look-2-suit-obezd-640.webp}} 640w, {{asset:img/v4/looks/look-2-suit-obezd-900.webp}} 900w, {{asset:img/v4/looks/look-2-suit-obezd-1200.webp}} 1200w"
},
"03": {
"avif": "{{asset:img/v4/looks/look-3-jacket-restart-640.avif}} 640w, {{asset:img/v4/looks/look-3-jacket-restart-900.avif}} 900w, {{asset:img/v4/looks/look-3-jacket-restart-1200.avif}} 1200w",
"webp": "{{asset:img/v4/looks/look-3-jacket-restart-640.webp}} 640w, {{asset:img/v4/looks/look-3-jacket-restart-900.webp}} 900w, {{asset:img/v4/looks/look-3-jacket-restart-1200.webp}} 1200w"
},
"04": {
"avif": "{{asset:img/v4/looks/look-4-longsleeve-redline-640.avif}} 640w, {{asset:img/v4/looks/look-4-longsleeve-redline-900.avif}} 900w, {{asset:img/v4/looks/look-4-longsleeve-redline-1200.avif}} 1200w",
"webp": "{{asset:img/v4/looks/look-4-longsleeve-redline-640.webp}} 640w, {{asset:img/v4/looks/look-4-longsleeve-redline-900.webp}} 900w, {{asset:img/v4/looks/look-4-longsleeve-redline-1200.webp}} 1200w"
}
};
/*</photos>*/
