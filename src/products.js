/* GRINCHIN — данные дропа 01. Владелец: A.
   Цены, размеры, наличие, составы и даты — ПРИМЕР (example:true), до решения владельцев.
   Фото — плейсхолдеры src/img/<id>-1.svg (вещь) и -2.svg (деталь), генератор src/img/_gen.py. */
window.GV_DROP = {
  name: "Дроп 01",
  shipFrom: "01.12",          // пример: «отправка с …» (роадмап: старт продаж — ноябрь)
  preorderTill: "30.11",      // пример
  example: true
};

window.GV_CATEGORIES = [
  { id: "all",     label: "Всё" },
  { id: "jeans",   label: "Джинсы" },
  { id: "suit",    label: "Костюм" },
  { id: "hoodie",  label: "Худи" },
  { id: "jacket",  label: "Куртка" },
  { id: "tees",    label: "Футболки и лонги" }
];

window.GV_PRODUCTS = [
  {
    id: "jeans-restart", sku: "GR-01-01", category: "jeans",
    name: "Джинсы RESTART", marker: "[ЧЁРНЫЙ / КРАСНЫЙ ПРИНТ]", type: "джинсы",
    price: 8900, state: "new",
    sizes: { S: 3, M: 6, L: 0, XL: 4, XXL: 2 },
    desc: "Широкие чёрные джинсы с красным принтом от руки: RESTART, Let it B, стрелки.",
    details: ["Широкий прямой крой, посадка средняя", "Принт нанесён вручную, у каждой пары свой почерк", "Пять карманов, металлическая фурнитура"],
    composition: "100% хлопок, деним 13 oz", care: "Стирка 30°, наизнанку, без отбеливания",
    model: "Модель 187 см, носит L", fit: "Свободный",
    pairs: ["hoodie-crack", "tee-blank"],
    img: ["{{img:img/jeans-restart-1.svg}}", "{{img:img/jeans-restart-2.svg}}"],
    example: true
  },
  {
    id: "suit-detour", sku: "GR-01-02", category: "suit",
    name: "Костюм «Обходной путь»", marker: "[БЕЖ / ЛЕС / ОЛИВА]", type: "костюм: куртка + брюки",
    price: 16900, state: "preorder",
    sizes: { S: 2, M: 5, L: 5, XL: 3, XXL: 0 },
    desc: "Ветровка на молнии и широкие брюки. Беж, лес, олива — цвет, который замечают.",
    details: ["Куртка: воротник-стойка, резинка по низу и на манжетах", "Брюки: пояс на резинке, широкая штанина", "Продаётся комплектом"],
    composition: "100% полиэстер, подкладка — сетка", care: "Стирка 30°, деликатный режим, не гладить вставки",
    model: "Модель 184 см, носит L", fit: "Оверсайз",
    pairs: ["tee-blank", "longsleeve-blank"],
    img: ["{{img:img/suit-detour-1.svg}}", "{{img:img/suit-detour-2.svg}}"],
    example: true
  },
  {
    id: "jeans-scribble", sku: "GR-01-03", category: "jeans",
    name: "Джинсы «Каракули»", marker: "[СЕРЫЙ ВАРЁНЫЙ]", type: "джинсы",
    price: 9500, state: "preorder",
    sizes: { S: 0, M: 4, L: 6, XL: 4, XXL: 1 },
    desc: "Варёный серый деним, красные каракули вышивкой — от пояса до подгиба.",
    details: ["Широкий крой с объёмом по бедру", "Сплошная вышивка нитью", "Варка вручную: двух одинаковых пар нет"],
    composition: "100% хлопок, деним 12 oz", care: "Стирка 30°, наизнанку, отдельно от светлого",
    model: "Модель 187 см, носит L", fit: "Свободный",
    pairs: ["hoodie-crack", "longsleeve-blank"],
    img: ["{{img:img/jeans-scribble-1.svg}}", "{{img:img/jeans-scribble-2.svg}}"],
    example: true
  },
  {
    id: "hoodie-crack", sku: "GR-01-04", category: "hoodie",
    name: "Худи «Трещина»", marker: "[ГРАФИТ ВАРЁНЫЙ]", type: "худи",
    price: 7500, state: "new",
    sizes: { S: 4, M: 8, L: 7, XL: 5, XXL: 3 },
    desc: "Варёное худи с трещинами по спине. Стена, в которой нашлась щель.",
    details: ["Капюшон двойной, без завязок", "Спущенное плечо, рукав с запасом", "Жаккардовая бирка G на шве"],
    composition: "80% хлопок, 20% полиэстер, 380 г/м²", care: "Стирка 30°, наизнанку, сушить разложенным",
    model: "Модель 187 см, носит L", fit: "Оверсайз",
    pairs: ["jeans-restart", "jeans-scribble"],
    img: ["{{img:img/hoodie-crack-1.svg}}", "{{img:img/hoodie-crack-2.svg}}"],
    example: true
  },
  {
    id: "jacket-biker", sku: "GR-01-05", category: "jacket",
    name: "Косуха с капюшоном", marker: "[ГРАФИТ ВАРЁНЫЙ]", type: "куртка",
    price: 14900, state: "preorder",
    sizes: { S: 1, M: 3, L: 4, XL: 0, XXL: 0 },
    desc: "Косуха из варёного хлопка, с капюшоном. Без кожи и без пафоса.",
    details: ["Асимметричная молния, кнопки на лацканах", "Капюшон пришит, держит форму", "Пояс с металлической пряжкой"],
    composition: "100% хлопок, канвас с варкой", care: "Только деликатная стирка 30°, без сушильной машины",
    model: "Модель 182 см, носит L", fit: "Свободный",
    pairs: ["jeans-redline", "tee-blank"],
    img: ["{{img:img/jacket-biker-1.svg}}", "{{img:img/jacket-biker-2.svg}}"],
    example: true
  },
  {
    id: "jeans-redline", sku: "GR-01-06", category: "jeans",
    name: "Джинсы «Красная линия»", marker: "[ТЁМНЫЙ ИНДИГО]", type: "джинсы",
    price: 8500, state: "new",
    sizes: { S: 2, M: 5, L: 5, XL: 3, XXL: 2 },
    desc: "Тёмный деним, красная строчка по всем швам. За эту линию можно заходить.",
    details: ["Широкий крой, длина в пол", "Контрастная красная строчка по всем швам", "Дуги-вытачки на коленях"],
    composition: "100% хлопок, деним 13 oz", care: "Стирка 30°, наизнанку",
    model: "Модель 187 см, носит L", fit: "Свободный",
    pairs: ["jacket-biker", "longsleeve-blank"],
    img: ["{{img:img/jeans-redline-1.svg}}", "{{img:img/jeans-redline-2.svg}}"],
    example: true
  },
  {
    id: "tee-blank", sku: "GR-01-07", category: "tees",
    name: "Футболка «Бланк»", marker: "[БЕЛЫЙ]", type: "футболка",
    price: 3900, state: "new",
    sizes: { S: 6, M: 9, L: 9, XL: 6, XXL: 4 },
    desc: "Плотная белая база. Только G у подола.",
    details: ["Плотный хлопок, держит форму", "Рибана на горловине", "Жаккардовая бирка G у подола"],
    composition: "100% хлопок, 240 г/м²", care: "Стирка 40°, гладить с изнанки",
    model: "Модель 187 см, носит L", fit: "Свободный",
    pairs: ["jeans-restart", "suit-detour"],
    img: ["{{img:img/tee-blank-1.svg}}", "{{img:img/tee-blank-2.svg}}"],
    example: true
  },
  {
    id: "longsleeve-blank", sku: "GR-01-08", category: "tees",
    name: "Лонгслив «Бланк»", marker: "[БЕЛЫЙ]", type: "лонгслив",
    price: 4500, state: "soldout",
    sizes: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
    desc: "Белый лонгслив, длинная манжета в рубчик, G у подола.",
    details: ["Удлинённая манжета в рубчик", "Плотный хлопок", "Жаккардовая бирка G у подола"],
    composition: "100% хлопок, 220 г/м²", care: "Стирка 40°, гладить с изнанки",
    model: "Модель 187 см, носит L", fit: "Свободный",
    pairs: ["jeans-redline", "jeans-scribble"],
    img: ["{{img:img/longsleeve-blank-1.svg}}", "{{img:img/longsleeve-blank-2.svg}}"],
    example: true
  }
];

/* Образы дропа: пронумерованы, как в коллекции (NOCONCEPT '01…). Вещи — по id. */
window.GV_LOOKS = [
  { n: "01", title: "Обходной путь", note: "Костюм целиком, под ним бланк.", items: ["suit-detour", "tee-blank"] },
  { n: "02", title: "Restart", note: "Чёрное с красным, сверху — трещина.", items: ["hoodie-crack", "jeans-restart"] },
  { n: "03", title: "Красная линия", note: "Косуха и строчка, которая идёт за край.", items: ["jacket-biker", "jeans-redline"] },
  { n: "04", title: "Каракули", note: "Варёный серый и белый лонгслив.", items: ["jeans-scribble", "longsleeve-blank"] }
];
