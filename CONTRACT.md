# Контракт модулей сайта GRINCHIN (v1)

Читать вместе с `../PROJECT.md` (что строим и почему) и `../research/0*.md` (детали).
Три агента пишут в `src/` ТОЛЬКО свои файлы. Чужие файлы не правят — если нужно изменение у соседа, пишут об этом в финальном отчёте.

## Сборка и проверка
- `python3 build.py` → `dist/grinchin.html` (один файл). Маркеры: `<!--@css:f-->`, `<!--@js:f-->`, `<!--@html:f-->`, `<!--@svg:name-->`, `{{img:path}}` (путь от `src/`). Не найденный файл — ошибка сборки.
- `./shot.sh <имя> [доп.query]` → `shots/<имя>_{desktop,mobile,desktopfull,mobilefull}.png` (headless Chrome). Смотреть их инструментом Read. Это единственный способ визуальной проверки — встроенный браузер НЕ использовать.
- **`?shot=1`** в URL → `document.documentElement.dataset.shot="1"` (ставит A первым inline-скриптом в `<head>`). При нём: лоадер пропущен, вход-анимации сразу в конечном состоянии, 3D рендерит один статичный кадр. Каждый модуль обязан это уважать.
- Доп. query для проверки оверлеев: `&open=product:<id>`, `&open=cart`, `&open=sizes`, `&open=404`, `&game=5` (игра пройдена). Парсит A (оверлеи) и C (игра).
- `prefers-reduced-motion: reduce` → никаких лоадера, морфинга, лент-переходов, авто-вращения 3D; только мгновенные смены и opacity ≤200 мс.

## Ограничения (артефакт)
- Внешние скрипты ТОЛЬКО: `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.15.0/{gsap,ScrollTrigger,MorphSVGPlugin,DrawSVGPlugin,Draggable}.min.js` (подключает A в `<head>`, `defer` не ставить — порядок важен, все перед инлайн-скриптами модулей) и three.js `https://cdnjs.cloudflare.com/ajax/libs/three.js/0.186.1/three.module.min.js` (только C, через динамический `import()` после `grinchin:ready`). Других библиотек нет.
- Шрифты — только Google Fonts (ссылку ставит A): `https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;800;900&family=Inter:wght@400;500;600;700&family=Martian+Mono:wght@400;500;700&display=swap`
- Никаких fetch/XHR, внешних картинок, видео по ссылке. Картинки — только `{{img:...}}`.
- Бюджет: весь файл без товарных фото ≤ 1,2 МБ; JS модулей суммарно ≤ 120 КБ несжатых.
- localStorage/sessionStorage — только в try/catch, сайт обязан работать без них.

## Владение файлами
| Файл | Владелец |
|---|---|
| `src/tokens.css` | координатор (не править; нужен токен — попросить в отчёте) |
| `src/index.html`, `src/base.css`, `src/shop.js`, `src/products.js`, `src/img/*` | **A — каркас и путь клиента** |
| `src/motion.css`, `src/motion.js`, `src/loader.html`, `src/svg/*.svg` | **B — моушн и лента** |
| `src/game.css`, `src/game.js`, `src/three-g.js` | **C — 3D и игра** |

Порядок подключения в `index.html` (A ставит маркеры именно так):
`<head>`: shot-скрипт → шрифты → GSAP-скрипты → `<!--@css:tokens.css-->` `<!--@css:base.css-->` `<!--@css:motion.css-->` `<!--@css:game.css-->`.
Начало `<body>`: `<!--@html:loader.html-->`. Конец `<body>`: `<!--@js:products.js-->` `<!--@js:shop.js-->` `<!--@js:motion.js-->` `<!--@js:game.js-->` `<!--@js:three-g.js-->`.
Пока у соседа файла нет — создай пустую заглушку только если её нет (одной строкой-комментарием), содержимое чужих файлов не трогай.

## Разметка: id и хуки (A создаёт, B и C наполняют)
- Разделы: `#status` (полоса статуса), `#header`, `#hero`, `#drop`, `#looks`, `#about`, `#gather`, `#next`, `#footer`.
- Оверлеи (A): `#product-sheet`, `#size-modal`, `#cart-drawer`, `#page-404`. Открытие/закрытие — `GV.open('cart'|'sizes'|'404'|'product', id?)`, `GV.close()`; при открытии на `<html>` ставится `data-overlay="<имя>"`.
- Лого в шапке: `<a id="logo" href="#hero"><!--@svg:logo--></a>` — SVG даёт B (`svg/logo.svg`, `fill="currentColor"`).
- Hero: `<div id="g3d" aria-hidden="true"></div>` — место для 3D-G (C). Заголовок hero — `#hero-title`.
- Счётчик игры в шапке: `<div id="gather-counter"></div>` (C рисует).
- Слоты меток игры: `<span class="gm-slot" data-mark-slot="1..5"></span>` — 1 в `#hero`, 2 в `#drop` (внутри 6-й карточки), 3 в `#looks`, 4 в `#about`, 5 в `#footer` (под отрывной лентой). Пустые, C их наполняет.
- «О бренде»: `<div id="logo-story"></div>` внутри `#about` — B строит скролл-историю. Манифест-текст в `#about` пишет A.
- «Точка сбора»: `<div id="gather-stage"></div>` внутри `#gather` — C. Подзаголовки и пояснение — A.
- Бегущие ленты: `<div class="tape-run" data-text="GRINCHIN • ГРИНЧИТЬ • ТОЧКА СБОРА"></div>` — A ставит между разделами (минимум 2 места), B оживляет.
- Отрывная лента футера: `<div id="footer-tape"></div>` поверх контактов — B.
- Карточка каталога: `<article class="card" data-id="…" data-state="preorder|new|soldout">` → внутри `.card-media` (два `<img class="card-img">`, второй `.card-img--alt`), `.card-badges` со `<span class="tape-badge" data-kind="new|drop|preorder|soldout">`, `.card-body`. Стилизует ленточный бейдж и ч/б→цвет — B (`.card-media` на hover/фокус/в зоне видимости на mobile).
- Образы: `<figure class="look" data-look="01">` → `.look-photo` + `.look-tape` (2 шт., B анимирует) + `.look-tag` (бирка под отгибом).
- Маскот «Ухмыл»: `<div class="smirk" data-mood="idle|sad|happy|wink|look"></div>` — A ставит в пустую корзину и в `#page-404`; B рисует и анимирует по `data-mood`.

## События (CustomEvent на `document`)
| Событие | detail | Кто шлёт | Кто слушает |
|---|---|---|---|
| `grinchin:ready` | — | B (лоадер закончился или пропущен; при shot/reduced — сразу) | A, C |
| `grinchin:cart` | `{count, items}` | A | B (корзина-улыбка), C |
| `grinchin:add` | `{id, size}` | A | B (подмигивание, «шлепок» бейджа корзины) |
| `grinchin:overlay` | `{name, open}` | A | B, C |
| `grinchin:navigate` | `{target}` (id раздела) | A (клик по навигации) | B — проигрывает переход лентой и сам скроллит; если B не ответил `e.preventDefault()` за тот же тик — A скроллит сам |
| `grinchin:mark` | `{n, found:[…], total:5}` | C | A (тост), B (эффект) |
| `grinchin:gather-complete` | — | C | A, B |

Глобальный неймспейс — только `window.GV` (A создаёт объект; B кладёт `GV.motion`, C — `GV.game`, `GV.g3d`).

## Тон и тексты
Банк фраз — `research/03_brand_system.md` §5. Обращение на «ты», коротко, с иронией, без капслока в абзацах. Персонажа Гринча, его имени и кадров мультфильма — нигде.

## Товары v1 (A кладёт в `products.js`)
Восемь позиций по фото Матвея (`../assets/products/raw/README.md`). Цены/размеры/даты — заглушки, в данных `example:true`, в интерфейсе пометка «цены и даты — пример». Фото товаров на этой итерации — НЕ использовать исходники; A делает стильные плейсхолдеры (силуэт вещи в линию на paper + лента «ФОТО СКОРО»). Обработку фото координатор делает последней.

## Отчёт агента
В конце: что сделано, какие хуки/события реально использованы, что требуется от соседей, скриншоты, которые смотрел, известные недоделки.
