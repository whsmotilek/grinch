/* GRINCHIN — данные дропа 01. Владелец: K1.
   Цены, размеры, наличие, составы и даты — ПРИМЕР (example:true), до решения владельцев.
   Имена по copy deck v2 (audit/05 §4.3): ТИП + СЛОВО, цвет — [в скобках].
   id не менялись с v1 (на них ссылаются соседи: looks.html → a[data-product="…"]).
   Эскизы — src/img/<id>-1.svg (вещь) и -2.svg (деталь), генератор src/img/_gen.py. Грузятся файлами, не base64. */
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
    fit: "оверсайз", model: "184 см, носит L",
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
    fit: "свободная", model: "182 см, носит L",
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
window.GV_PRODUCTS.forEach(function (p) { p.name = p.type + " " + p.word; });

/* Образы — только данные; вёрстка у K3 в looks.html, подписи K3 берёт из GV_PRODUCTS через a[data-product].
   По реальным кадрам: '01 и '02 — джинсы КАРАКУЛИ, '03 — футболка и лонгслив ФОН, '04 — пакет («так приходит заказ»), без вещей.
   Карточка товара показывает «Из образа ’NN» по первому образу, где вещь есть; у кого образа нет — ссылки нет. */
window.GV_LOOKS = [
  { n: "01", items: ["jeans-scribble"] },
  { n: "02", items: ["jeans-scribble"] },
  { n: "03", items: ["tee-blank", "longsleeve-blank"] },
  { n: "04", items: [] }
];
