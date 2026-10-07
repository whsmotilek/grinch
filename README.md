# GRINCHIN — сайт дропа 01

Промо-сайт первого дропа. Демо-версия: цены, размеры, даты и фото товаров — примеры.

**Сайт:** https://whsmotilek.github.io/grinch/

## Как устроено
- Исходники — `src/`, собираются в один самодостаточный HTML: `python3 build.py` → `dist/grinchin.html`.
- Каждый push в `main` собирает сайт и выкладывает его на GitHub Pages (`.github/workflows/pages.yml`).
- Модули и правила их стыковки — `CONTRACT.md`.

| Модуль | Файлы |
|---|---|
| Каркас, каталог, карточка, корзина | `index.html`, `base.css`, `shop.js`, `products.js`, `img/` |
| Загрузка-ухмылка, лента, история лого, маскот | `loader.html`, `motion.css`, `motion.js`, `svg/` |
| 3D-буква G, игра «Точка сбора» | `three-g.js`, `game.js`, `game.css` |
| Цвета и шрифты | `tokens.css` |

## Локальная проверка
- `python3 build.py` и открыть `dist/grinchin.html`.
- `./shot.sh <имя>` — скриншоты desktop/mobile в `shots/` (нужен Google Chrome).
- `?shot=1` — без загрузки и вход-анимаций; `&open=cart|sizes|404|product:<id>`, `&cart=demo`, `&game=5`.
