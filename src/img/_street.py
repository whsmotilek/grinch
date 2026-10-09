#!/usr/bin/env python3
"""v2 (K3): лента и фото «улицы» из СОБСТВЕННЫХ материалов бренда. Детерминирован (фиксированные seed).

Запуск из site/:  python3 src/img/_street.py  [tape|photo]   (без аргумента — всё, ≈10 с)

Источники — ../../assets/brand_raster (растры из PDF в нативном разрешении):
  old/p-009-058   мятая белая малярная лента, 3443 px — ЕДИНСТВЕННЫЙ источник формы/заломов/рваных концов
                  → tape/pin-1…5.webp (белые куски разной формы), tape/green-1…3.webp (фирменная зелёная:
                    форма и светотень скана, цвет бренда ПОД светотенью, печать GRINCHIN гротеском ПОД заломами)
  new/pg-011-018  модель, косуха + джинсы, на чёрном → street/hero-*.{avif,jpg} (целый кадр, ретушь зелёной точки)
  new/pg-011-010  модель, «Каракули» + худи        → street/look-a-*
  new/pg-011-024  модель, «Каракули», взгляд вниз  → street/look-b-*
  new/pg-015-038  жаккардовая G у подола футболки  → street/look-c-*
  new/pg-020-088  пакет с фирменной лентой          → street/bag-*      (образ '04 и пакет подписки у K5)
  new/pg-021-090  дверь, GRINCHIN зелёным скотчем   → street/door-*     (БЕЗ обработки, только пережатие)
  old/p-018-122/118/120  N: наклеили → сорвали → скан → street/n-1…3-*
Чужие мудборды (old/p-002…012, new/pg-018/019) и Гринч (pg-008) НЕ используются.
"""
from __future__ import annotations
import pathlib, sys
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = pathlib.Path(__file__).resolve().parent
RAW = HERE.parents[2] / "assets" / "brand_raster"
OUT_T = HERE / "tape"; OUT_S = HERE / "street"
OUT_T.mkdir(exist_ok=True); OUT_S.mkdir(exist_ok=True)
ONLY = sys.argv[1] if len(sys.argv) > 1 else "all"

def f32(im): return np.asarray(im).astype(np.float32) / 255
def smooth(x, a, b): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def report(p):
    with Image.open(p) as im: w, h = im.size
    print(f"  {p.relative_to(HERE)}  {w}x{h}  {p.stat().st_size / 1024:.0f} КБ")
def resize(a, w, h):
    """float-массив (H,W[,C]) → (h,w) Lanczos, по каналам (Pillow F-режим)."""
    if a.ndim == 2: return np.asarray(Image.fromarray(a.astype(np.float32), "F").resize((w, h), Image.LANCZOS))
    return np.dstack([resize(a[..., c], w, h) for c in range(a.shape[2])])

# =====================================================================================
# 1. ЛЕНТА. Скан old/p-009-058: выпрямляем (−7,6°), маска по яркости, светотень = яркость скана.
# =====================================================================================
def tape():
    print("лента: скан p-009-058")
    scan = Image.open(RAW / "old/p-009-058.jpg").convert("L").rotate(-7.6, resample=Image.BICUBIC, expand=True, fillcolor=0)
    S = f32(scan)
    M = S > .09
    M = ndimage.binary_fill_holes(ndimage.binary_opening(M, iterations=2))
    lab, n = ndimage.label(M); M = lab == (np.argmax(ndimage.sum(M, lab, range(1, n + 1))) + 1)
    ys, xs = np.where(M); S = S[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; M = M[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    H0, W0 = S.shape
    A0 = ndimage.gaussian_filter(M.astype(np.float32), .9)       # натуральная альфа (волокна концов)
    LUM = S / np.median(S[M])                                     # 1.0 — ровно, <1 складка, >1 гребень
    # за пределами ленты — тон ближайшей точки ленты (иначе ворс новых отрывов окрасится в чёрный фон скана)
    _, (iy, ix) = ndimage.distance_transform_edt(~(A0 > .6), return_indices=True)
    LUM = LUM[iy, ix]
    print(f"  кусок {W0}x{H0}")

    # кромки ленты по колонкам → гладкая аппроксимация; по ней ленту «распрямляем» для длинных полос
    cols = np.arange(W0)
    cov = M.sum(0); full = cov > .8 * cov.max()
    top = np.array([np.argmax(M[:, x]) if M[:, x].any() else 0 for x in cols], float)
    bot = np.array([H0 - 1 - np.argmax(M[::-1, x]) if M[:, x].any() else 0 for x in cols], float)
    TOP = np.polyval(np.polyfit(cols[full], top[full], 3), cols)
    BOT = np.polyval(np.polyfit(cols[full], bot[full], 3), cols)
    THICK = float(np.median(BOT[full] - TOP[full]))
    print(f"  толщина ленты в скане ≈ {THICK:.0f} px")

    def torn_edge(alpha, side, seed, depth, tilt=0.):
        """Новый рваный край малярной ленты: крупные зубцы + мелкий полупрозрачный ворс волокон."""
        rng = np.random.default_rng(seed)
        h, w = alpha.shape
        wave = np.cumsum(rng.normal(0, 1, h)); wave = ndimage.gaussian_filter1d(wave - wave.mean(), h * .02)
        wave = wave / (np.abs(wave).max() + 1e-6) * depth * .6
        teeth = ndimage.gaussian_filter1d(rng.standard_t(2, h), max(h * .006, 1))
        teeth = teeth / (np.abs(teeth).max() + 1e-6) * depth * .35
        fine = ndimage.gaussian_filter1d(rng.normal(0, 1, h), 1.2) * depth * .08
        edge = depth + wave + teeth + fine + np.linspace(-tilt, tilt, h) * h
        x = np.arange(w)[None, :].astype(float)
        d = (x - edge[:, None]) if side == "l" else ((w - 1 - x) - edge[:, None])
        body = smooth(d, -.8, 1.4)
        fib = ndimage.gaussian_filter(rng.random((h, w)), (.7, 2.6)); fib = (fib - fib.min()) / (np.ptp(fib) + 1e-6)
        fringe = smooth(d, -depth * .35, 0) * smooth(fib, .58, .68) * .7
        return alpha * np.where(d < 0, fringe, body)

    def trim(rgba, thr=.02):
        ys, xs = np.where(rgba[..., 3] > thr)
        return rgba[max(ys.min() - 2, 0):ys.max() + 3, max(xs.min() - 2, 0):xs.max() + 3]

    def save_rgba(rgba, path, q=82):
        Image.fromarray((np.clip(rgba, 0, 1) * 255 + .5).astype(np.uint8), "RGBA").save(path, quality=q, method=6, alpha_quality=92)
        report(path)

    # ---------- 1a. белые «пины»: 5 кусков РАЗНОЙ формы, нативный скан (без распрямления) ----------
    #  name   доля длины  левый   правый  зеркало  наклон отрывов  ширина растра
    # длина куска 3–4 ширины: берём 55–70 % скана и сжимаем поперёк (лента в скане 4:1 — шире, чем нужно)
    PINS = [
        ("pin-1", .00, .62, "nat", "tear", False, (.10, -.06), 440),   # натуральный конец с отгибом угла
        ("pin-2", .40, 1.0, "tear", "nat", False, (-.08, .05), 430),   # натуральный рваный конец справа
        ("pin-3", .22, .74, "tear", "tear", False, (.06, .13), 380),   # середина: диагональный залом
        ("pin-4", .08, .58, "tear", "tear", True, (-.13, .04), 360),   # зеркальный, короткий
        ("pin-5", .30, .96, "tear", "tear", True, (.03, -.11), 460),   # длинный, продольный залом
    ]
    for i, (name, a, b, le, re_, flip, (tl, tr), wout) in enumerate(PINS):
        x0, x1 = int(W0 * a), int(W0 * b)
        lum = LUM[:, x0:x1].copy(); al = A0[:, x0:x1].copy()
        if le == "tear": al = torn_edge(al, "l", 100 + i, THICK * .1, tl)
        if re_ == "tear": al = torn_edge(al, "r", 200 + i, THICK * .1, tr)
        if flip: lum, al = lum[:, ::-1], al[:, ::-1]
        # малярная: чуть кремовая и матовая; складки мягко серые, гребни не выжигаем
        tone = .94 * np.clip(lum, 0, 1.08) ** .9
        rgb = np.dstack([tone, tone * .985, tone * .955])
        inner = ndimage.gaussian_filter((al > .5).astype(np.float32), 4)
        alpha = al * (.93 - .2 * (1 - inner))                       # просвечивает 7 %, у кромки больше
        rgba = trim(np.dstack([rgb, alpha]))
        h, w = rgba.shape[:2]
        save_rgba(resize(rgba, wout, round(h * wout / w * .74)), OUT_T / f"{name}.webp")

def pvc():
    """Фирменная ПВХ-лента — НАСТОЯЩАЯ, с фото пакета pg-020-088 (диагональная полоса, она целая — лежит поверх
    горизонтальной). Печать GRINCHIN, глянец и вспышка — свои, из кадра. Полосу распрямляем поворотом,
    кромки — по прямым (ПВХ не мнётся по краю), видимый конец срезан ножом, правый уходит за край экрана."""
    print("лента: ПВХ с пакета pg-020-088")
    a = f32(Image.open(RAW / "new/pg-020-088.jpg").convert("RGB"))
    H, W = a.shape[:2]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    key = (g > .45) & (g - np.maximum(r, b) > .22)
    key = ndimage.binary_fill_holes(ndimage.binary_closing(key, np.ones((15, 15))))    # + чёрная печать внутри
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # кромки диагонали (замер по строкам вне пересечения, как у K5 в img/end/_end.py)
    dl = 542 + (yy - 150) * .7255; dr = 682 + (yy - 150) * .7236
    m = key & (xx > dl - 6) & (xx < dr + 6)
    ang = float(np.degrees(np.arctan2(1, .7245)))
    im = Image.fromarray((np.dstack([a, m.astype(np.float32)]) * 255 + .5).astype(np.uint8), "RGBA")
    im = im.rotate(ang, resample=Image.BICUBIC, expand=True)
    im = im.crop(im.getbbox())
    t = f32(im); h, w = t.shape[:2]
    # ровные кромки: прямые по медианам верхнего/нижнего края в чистой середине полосы
    cols = range(int(w * .2), int(w * .8), 4)
    top = np.median([np.argmax(t[:, x, 3] > .5) for x in cols]); bot = np.median([h - 1 - np.argmax(t[::-1, x, 3] > .5) for x in cols])
    top += 2; bot -= 2                                                    # срезаем полупиксельную кайму фона
    y = np.arange(h)[:, None].astype(np.float32)
    edge = smooth(y - top, -.5, 1.0) * smooth(bot - y, -.5, 1.0)
    # видимый конец — срез ножом, чуть наискось; справа — оставляем до начала скоса (дальше он за краем экрана)
    x = np.arange(w)[None, :].astype(np.float32)
    x0 = w * .13; x1 = w * .85
    cut = smooth(x - (x0 + (y - top) / (bot - top) * (bot - top) * .1), -.6, .9) * (x < x1)
    alpha = edge * cut
    # под альфой — только сама лента (на кромке пересечения в маску попали чужие пиксели; кромка теперь прямая)
    # у верхней кромки на пересечении полос остались крошки чужой печати — заменяем тоном ленты на 5 px ниже
    rgb = t[..., :3].copy(); it = int(top)
    for yy_ in range(it - 1, it + 5):
        dark = rgb[yy_].max(1) < .45
        rgb[yy_][dark] = rgb[it + 6][dark]
    rgba = np.dstack([rgb, alpha])
    ys = slice(int(top) - 2, int(bot) + 3); xs = slice(int(x0) - 3, int(x1))
    rgba = rgba[ys, xs]
    p = OUT_T / "pvc.webp"
    Image.fromarray((np.clip(rgba, 0, 1) * 255 + .5).astype(np.uint8), "RGBA").save(p, quality=86, method=6, alpha_quality=95)
    report(p)

if ONLY in ("all", "tape"): tape(); pvc()

# =====================================================================================
# 2. ФОТО. Только целые кадры, родные пропорции, без апскейла. AVIF + JPEG-фолбэк, две ширины (1× и 2×).
# =====================================================================================
FOREST = np.array([0x10, 0x34, 0x0C]) / 255

def grade(a, sat=.85, tint=.015):
    """Общий лёгкий грейд: насыщенность −15 %, тени в зелень на 1–2 %. Чистый чёрный фон остаётся #000."""
    L = (a * np.array([.2126, .7152, .0722])).sum(2, keepdims=True)
    a = L + (a - L) * sat
    w = ((1 - L) ** 2) * tint * smooth(L, .015, .06)
    return np.clip(a * (1 - w) + FOREST * w, 0, 1)

def defringe(a):
    """Вырезка в исходнике оставила цветной ореол (красные/зелёные пиксели) на границе с чёрным фоном.
    Гасим только у фона: насыщенный тёмный пиксель, рядом с которым ≥30 % чистого чёрного."""
    mx = a.max(2); mn = a.min(2)
    bg = (mx < 6 / 255).astype(np.float32)
    near = ndimage.uniform_filter(bg, 9) > .3
    chroma = (mx - mn) > .07
    bad = near & chroma & (mx < .5)
    bad = ndimage.binary_dilation(bad, iterations=1) & near
    L = a.mean(2, keepdims=True)
    out = a.copy(); out[bad] = (L * .35)[bad]
    # крупные цветные кляксы вырезки (красное пятно у лица в pg-011-024, жёлто-зелёные точки у капюшона):
    # насыщенная компонента, чья кайма больше чем на 25 % — чистый фон. Вышивка на джинсах окружена денимом — не трогаем.
    hot = (mx - mn) > .22
    lab, n = ndimage.label(ndimage.binary_closing(hot, iterations=1))
    # фон = чёрные области, связанные с краем кадра (очки и тени внутри фигуры — не фон)
    lab0, _ = ndimage.label(mx < 8 / 255)
    edge_ids = np.unique(np.concatenate([lab0[0], lab0[-1], lab0[:, 0], lab0[:, -1]]))
    bgb = np.isin(lab0, edge_ids[edge_ids > 0])
    killed = 0
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None: continue
        y0, y1 = max(sl[0].start - 4, 0), sl[0].stop + 4; x0, x1 = max(sl[1].start - 4, 0), sl[1].stop + 4
        comp = lab[y0:y1, x0:x1] == i
        ring = ndimage.binary_dilation(comp, iterations=3) & ~comp
        if ring.sum() and bgb[y0:y1, x0:x1][ring].mean() > .25:
            grow = ndimage.binary_dilation(comp, iterations=1)
            out[y0:y1, x0:x1][grow] = 0; killed += int(grow.sum())
    # чистый красный/жёлтый мусор маски (r>90, g,b<30 или жёлто-зелёный при синем≈0) в 30 px от фона → фон
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    junk = ((r > .45) & (g < .08) & (b < .1)) | ((np.minimum(r, g) > .3) & (b < .1) & (np.abs(r - g) < .25) & (np.minimum(r, g) - b > .25))
    dist = ndimage.distance_transform_edt(~bgb)
    junk = ndimage.binary_dilation(junk & (dist < 30), iterations=2) & (dist < 34)
    out[junk] = 0
    return out, int(bad.sum()) + killed + int(junk.sum())

def soft_edge(a, top_frac=.12):
    """Край вырезки в исходнике — ступеньками и со светлой каймой 1–2 px. Модель стоит на #000, поэтому
    просто «утапливаем» край: маска фигуры сжимается на 1 px и растушёвывается (в волосах, верхние 12 % — сильнее)."""
    mx = a.max(2)
    lab0, _ = ndimage.label(mx < 8 / 255)
    sizes = ndimage.sum(np.ones_like(mx), lab0, range(1, lab0.max() + 1))
    edge_ids = set(np.unique(np.concatenate([lab0[0], lab0[-1], lab0[:, 0], lab0[:, -1]]))) - {0}
    big = [i + 1 for i, v in enumerate(sizes) if v > 900]           # «окна» фона между ног и под локтем
    bg = np.isin(lab0, list(edge_ids | set(big)))
    fg = ndimage.binary_erosion(~bg, iterations=1)
    H = a.shape[0]
    s1 = ndimage.gaussian_filter(fg.astype(np.float32), 1.0)
    s2 = ndimage.gaussian_filter(fg.astype(np.float32), 2.4)
    w = smooth(np.arange(H, dtype=np.float32) / H, top_frac * .6, top_frac)[:, None]   # 0 вверху (волосы) → 1
    alpha = np.minimum(s2 * (1 - w) + s1 * w, 1)
    alpha = np.where(fg, np.maximum(alpha, .0), alpha)
    return a * alpha[..., None]

def save_photo(a, name, widths, q_avif=58, q_jpg=80):
    im = Image.fromarray((np.clip(a, 0, 1) * 255 + .5).astype(np.uint8))
    for w in widths:
        r = im if w >= im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        for ext, kw in (("avif", dict(quality=q_avif, speed=4)), ("jpg", dict(quality=q_jpg, optimize=True, progressive=True))):
            p = OUT_S / f"{name}-{r.width}.{ext}"; r.save(p, **kw); report(p)

def photo():
    print("фото")
    rgbf = lambda n: f32(Image.open(RAW / n).convert("RGB"))
    # hero — pg-011-018 целиком; зелёная точка над головой (артефакт вырезки) → фон
    a = rgbf("new/pg-011-018.jpg")
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    dot = (np.minimum(r, g) - b > .12) & (g > .25)
    dot[60:] = False                                       # только над макушкой
    dot = ndimage.binary_dilation(dot, iterations=3)
    a[dot] = 0
    a, nf = defringe(a); print(f"  hero: точка {int(dot.sum())} px, ореол {nf} px")
    save_photo(grade(soft_edge(a)), "hero", (1024, 640), q_avif=60)
    # образы
    for src, name, widths in (("new/pg-011-010.jpg", "look-a", (960, 480)), ("new/pg-011-024.jpg", "look-b", (960, 480))):
        a, nf = defringe(rgbf(src)); print(f"  {name}: ореол {nf} px")
        save_photo(grade(soft_edge(a)), name, widths)
    save_photo(grade(rgbf("new/pg-015-038.jpg"), sat=.9, tint=.01), "look-c", (960, 480), q_avif=50)
    save_photo(grade(rgbf("new/pg-015-040.jpg"), sat=.9, tint=.01), "look-d", (960, 480), q_avif=48)
    # знак: дверь — без грейда/резкости (исходник 1448 px, на сайте ≤ 960 CSS px)
    save_photo(rgbf("new/pg-021-090.jpg"), "door", (1448, 1080, 800), q_avif=50, q_jpg=76)
    # N в трёх стадиях: наклеили (122) → сняли (118) → скан (120). Сканы ч/б — только пережатие
    for i, n in enumerate(("old/p-018-122.jpg", "old/p-018-118.jpg", "old/p-018-120.jpg"), 1):
        save_photo(rgbf(n), f"n-{i}", (840, 420), q_avif=54, q_jpg=78)

# =====================================================================================
# 3. УЛЫБКА НА ДВЕРИ. Знак бренда собирается на фото pg-021-090: под выклеенным словом GRINCHIN — улыбка с рогами
#    из той же зелёной ленты. Форма — вектор улыбки (svg/logo.svg, путь lg-smile) в той же раскладке, что в логотипе,
#    подогнанный по габаритам букв на фото. Фактура — НАСТОЯЩИЕ куски ленты с этой же двери (штанги I, N, H, R):
#    тот же свет, зерно и мятость. Улыбка выклеена кусками, как буквы: прямые отрезки по дуге, нахлёст со швом и тенью.
# =====================================================================================
def svg_paths(path):
    """Минимальный разбор SVG path (M m L l C c Z z — других команд в logo.svg нет) → список полигонов."""
    import re
    out = []
    for cls, d in re.findall(r'<path class="([^"]+)"[^>]*\sd="([^"]+)"', path.read_text()):
        toks = re.findall(r"[MmLlCcZz]|-?\d*\.?\d+", d)
        polys, cur, pos, start, cmd, i = [], [], np.zeros(2), np.zeros(2), None, 0
        def num():
            nonlocal i
            v = float(toks[i]); i += 1; return v
        while i < len(toks):
            t = toks[i]
            if t.isalpha(): cmd = t; i += 1
            if cmd in "Mm":
                p_ = np.array([num(), num()]); pos = p_ + (pos if cmd == "m" and cur else (pos if cmd == "m" else 0))
                if cur: polys.append(np.array(cur))
                cur = [pos.copy()]; start = pos.copy(); cmd = "l" if cmd == "m" else "L"
            elif cmd in "Ll":
                p_ = np.array([num(), num()]); pos = p_ + (pos if cmd == "l" else 0); cur.append(pos.copy())
            elif cmd in "Cc":
                c = [np.array([num(), num()]) for _ in range(3)]
                if cmd == "c": c = [pos + q for q in c]
                for tt in np.linspace(0, 1, 13)[1:]:
                    u = 1 - tt
                    cur.append(u ** 3 * pos + 3 * u * u * tt * c[0] + 3 * u * tt * tt * c[1] + tt ** 3 * c[2])
                pos = c[2].copy()
            elif cmd in "Zz":
                if cur: polys.append(np.array(cur)); cur = []
                pos = start.copy(); cmd = None
        if cur: polys.append(np.array(cur))
        out.append((cls, polys))
    return out

def door_smile(door):
    H, W = door.shape[:2]
    r, g, b = door[..., 0], door[..., 1], door[..., 2]
    gm = (g - np.maximum(r, b)) > .16
    gm = ndimage.binary_opening(gm, iterations=1)
    lab, n = ndimage.label(gm); sz = ndimage.sum(gm, lab, range(1, n + 1))
    letters = np.isin(lab, [i + 1 for i, v in enumerate(sz) if v > 800])
    ys, xs = np.where(letters); dx0, dx1, dy0, dy1 = xs.min(), xs.max(), ys.min(), ys.max()
    paths = svg_paths(HERE.parent / "svg/logo.svg")
    L = np.vstack([pp for cls, ps in paths if cls == "lg-l" for pp in ps])
    lx0, lx1, ly0, ly1 = L[:, 0].min(), L[:, 0].max(), L[:, 1].min(), L[:, 1].max()
    smile = [pp for cls, ps in paths if cls == "lg-smile" for pp in ps][0]
    sx = (dx1 - dx0) / (lx1 - lx0)
    sy = sx * 1.12                                   # буквы на двери вытянуты по высоте сильнее логотипа
    cxl = (lx0 + lx1) / 2; cxd = (dx0 + dx1) / 2
    def to_door(p): return np.stack([cxd + (p[:, 0] - cxl) * sx, dy1 + (p[:, 1] - ly1) * sy], 1)
    poly = to_door(smile)
    print(f"  буквы на двери x {dx0}–{dx1}, y {dy0}–{dy1}; улыбка x {poly[:,0].min():.0f}–{poly[:,0].max():.0f}, y {poly[:,1].min():.0f}–{poly[:,1].max():.0f}")
    # маска улыбки (сглаженная, 4× суперсэмплинг)
    from PIL import ImageDraw
    SS = 4
    mi = Image.new("L", (W * SS, H * SS), 0); ImageDraw.Draw(mi).polygon([tuple(q) for q in poly * SS], fill=255)
    mask = f32(mi.resize((W, H), Image.LANCZOS))
    # средняя линия: для каждой точки внешней (нижней) кромки — ближайшая точка внутренней, середина отрезка
    def rs(c, nn):
        d = np.r_[0, np.cumsum(np.hypot(*np.diff(c, axis=0).T))]
        t = np.linspace(0, d[-1], nn)
        return np.stack([np.interp(t, d, c[:, 0]), np.interp(t, d, c[:, 1])], 1)
    def half(sign):
        P = smile.copy()
        Q = P[np.where((P[:, 0] - 927.0) * sign >= -1)[0]]
        tip = int(np.argmin(Q[:, 1]))
        a_, b_ = Q[:tip + 1], Q[tip:]
        outer, inner = (a_, b_) if a_[:, 1].mean() > b_[:, 1].mean() else (b_, a_)
        if np.hypot(*(outer[0] - [927, 386])) > np.hypot(*(outer[-1] - [927, 386])): outer = outer[::-1]   # от центра к рогу
        O = rs(outer, 500); I = rs(inner, 1500)
        nn = np.argmin(((O[:, None, :] - I[None, :, :]) ** 2).sum(2), 1)
        return to_door((O + I[nn]) / 2)
    cl_l = half(-1); cl_r = half(+1)
    center = np.r_[cl_l[::-1], cl_r[1:]]             # от левого рога через центр к правому
    center = ndimage.gaussian_filter1d(center, 3, axis=0)
    dt = ndimage.distance_transform_edt(mask > .5)
    # куски ленты-штанги с этой двери: вертикальные штрихи букв (≈40 px), y — по высоте букв
    cov = letters[dy0:dy1].mean(0)
    runs, inrun = [], False
    for x in range(W):
        if cov[x] > .82 and not inrun: s0 = x; inrun = True
        if (cov[x] <= .82 or x == W - 1) and inrun:
            inrun = False
            if x - s0 >= 30: runs.append((s0, x))
    strips = []
    for s0, s1 in runs:
        for k in range(max(1, (s1 - s0) // 36)):
            a0 = s0 + k * 38; a1 = min(a0 + 40, s1)
            if a1 - a0 < 30: continue
            rgb_ = door[dy0 + 4:dy1 - 4, a0 + 2:a1 - 2].copy()
            lm = letters[dy0 + 4:dy1 - 4, a0 + 2:a1 - 2]
            if lm.mean() < .9: continue
            if (~lm).any():                          # просветы двери внутри образца → тон соседней ленты
                _, (iy, ix) = ndimage.distance_transform_edt(~lm, return_indices=True)
                rgb_ = rgb_[iy, ix]
            strips.append(np.rot90(rgb_, 1))         # длина — по горизонтали
    # выравниваем яркость образцов к общей медиане (на двери свет падает неровно — куски не должны «мигать»)
    med = np.median([np.median(st_.mean(2)) for st_ in strips])
    strips = [np.clip(st_ * (med / max(np.median(st_.mean(2)), 1e-3)) ** .8, 0, 1) for st_ in strips]
    print(f"  кусков-образцов ленты с двери: {len(strips)}")
    canvas = np.zeros((H, W, 4), np.float32)
    seglen = np.r_[0, np.cumsum(np.hypot(*np.diff(center, axis=0).T))]
    total = seglen[-1]
    rng = np.random.default_rng(21)
    s_ = 0.0; k = 0
    def put(piece, p0, p1, off):
        """Кусок ленты по хорде p0→p1 (+сдвиг по нормали): тень нахлёста под ним, затем сам кусок."""
        nonlocal canvas
        d = p1 - p0; ln = float(np.hypot(*d)); ang = np.arctan2(d[1], d[0])
        th = piece.shape[0]
        pc = np.asarray(Image.fromarray((np.clip(piece, 0, 1) * 255).astype(np.uint8)).resize((max(int(ln), 8), th), Image.LANCZOS)).astype(np.float32) / 255
        ph, pw = pc.shape[:2]
        nrm = np.array([-np.sin(ang), np.cos(ang)])
        c = (p0 + p1) / 2 + nrm * off
        # обратное отображение: точка холста → координата в куске
        ca, sa = np.cos(ang), np.sin(ang)
        x0_, y0_ = int(c[0] - ln), int(c[1] - ln); x1_, y1_ = int(c[0] + ln), int(c[1] + ln)
        x0_, y0_ = max(x0_, 0), max(y0_, 0); x1_, y1_ = min(x1_, W), min(y1_, H)
        YY, XX = np.mgrid[y0_:y1_, x0_:x1_].astype(np.float32)
        u = (XX - c[0]) * ca + (YY - c[1]) * sa + pw / 2
        v = -(XX - c[0]) * sa + (YY - c[1]) * ca + ph / 2
        inside = smooth(u, -.5, .8) * smooth(pw - u, -.5, .8) * smooth(v, -.5, .8) * smooth(ph - v, -.5, .8)
        col = np.dstack([ndimage.map_coordinates(pc[..., ch], [v, u], order=1, mode="nearest") for ch in range(3)])
        sub = canvas[y0_:y1_, x0_:x1_]
        # тень нахлёста: кромка нового куска чуть приподнята над нижним
        sh = ndimage.gaussian_filter(inside, 1.6)
        sh = np.roll(np.roll(sh, 1, 0), 1, 1)
        sub[..., :3] *= (1 - .2 * sh * (sub[..., 3] > 0))[..., None]
        a_ = inside[..., None]
        sub[..., :3] = sub[..., :3] * (1 - a_) + col * a_
        sub[..., 3] = np.maximum(sub[..., 3], inside)
    while s_ < total - 4:
        L_ = float(rng.uniform(150, 215))
        e_ = min(s_ + L_, total)
        if total - e_ < 60: e_ = total
        ov = 9.0
        a_s, b_s = max(s_ - ov, 0), min(e_ + ov, total)
        p0 = np.array([np.interp(a_s, seglen, center[:, 0]), np.interp(a_s, seglen, center[:, 1])])
        p1 = np.array([np.interp(b_s, seglen, center[:, 0]), np.interp(b_s, seglen, center[:, 1])])
        mid = np.array([np.interp((s_ + e_) / 2, seglen, center[:, 0]), np.interp((s_ + e_) / 2, seglen, center[:, 1])]).astype(int)
        # толщина полосы в этом месте; шире ленты — второй проход внахлёст (как в «G» на двери)
        win = dt[max(mid[1] - 30, 0):mid[1] + 30, max(mid[0] - 30, 0):mid[0] + 30]
        thick = 2 * float(win.max()) if win.size else 40
        piece = strips[k % len(strips)]; k += 3
        # лента одна, во всю ширину полосы (+ запас под изгиб хорды); фактура тянется поперёк ≤ 1,3×
        tw = int(np.clip(thick + 8, 40, 54))
        piece = np.asarray(Image.fromarray((np.clip(piece, 0, 1) * 255).astype(np.uint8)).resize((piece.shape[1], tw), Image.LANCZOS)).astype(np.float32) / 255
        put(piece, p0, p1, 0)
        s_ = e_
    # что не накрыла хорда (остриё рога, внешний изгиб) — доклеиваем отдельными кусками вдоль главной оси пятна
    hole = (mask > .3) & (canvas[..., 3] < .5)
    labh, nh = ndimage.label(ndimage.binary_dilation(hole, iterations=2))
    patched = 0
    for i_, sl in enumerate(ndimage.find_objects(labh), 1):
        yy_, xx_ = np.where(labh[sl] == i_)
        if len(yy_) < 12: continue
        pts = np.stack([xx_ + sl[1].start, yy_ + sl[0].start], 1).astype(np.float64)
        c0 = pts.mean(0)
        with np.errstate(all='ignore'):           # ложные предупреждения Accelerate в matmul
            u_, s_v, vt = np.linalg.svd(pts - c0, full_matrices=False)
            ax = vt[0]; proj = (pts - c0) @ ax; wid = float(np.ptp((pts - c0) @ vt[1])) + 10
        p0 = c0 + ax * (proj.min() - 10); p1 = c0 + ax * (proj.max() + 10)
        piece = strips[(i_ * 5) % len(strips)]
        piece = np.asarray(Image.fromarray((np.clip(piece, 0, 1) * 255).astype(np.uint8)).resize((piece.shape[1], int(np.clip(wid, 30, 60))), Image.LANCZOS)).astype(np.float32) / 255
        put(piece, p0, p1, 0); patched += len(yy_)
    hole = (mask > .3) & (canvas[..., 3] < .5)
    if hole.any():                                   # последние крошки — ближайшим цветом
        _, (iy, ix) = ndimage.distance_transform_edt(canvas[..., 3] < .5, return_indices=True)
        canvas[..., :3][hole] = canvas[..., :3][iy[hole], ix[hole]]; canvas[..., 3][hole] = 1
    print(f"  доклеено кусками: {patched} px, крошек: {int(hole.sum())} px")
    alpha = canvas[..., 3] * mask
    rgb_ = ndimage.gaussian_filter(canvas[..., :3], (.45, .45, 0))           # мягкость фото двери
    # тень, как у букв на двери: мягкая, вниз-вправо
    shadow = np.roll(np.roll(ndimage.gaussian_filter(alpha, 2.2), 3, 0), 2, 1) * .55
    out_a = alpha + shadow * (1 - alpha)
    out_rgb = (rgb_ * alpha[..., None]) / np.maximum(out_a, 1e-4)[..., None]
    rgba = np.dstack([out_rgb, out_a])
    ys, xs = np.where(out_a > .01)
    y0, y1, x0, x1 = ys.min() - 2, ys.max() + 3, xs.min() - 2, xs.max() + 3
    rgba = rgba[y0:y1, x0:x1]
    p = OUT_S / "door-smile.webp"
    Image.fromarray((np.clip(rgba, 0, 1) * 255 + .5).astype(np.uint8), "RGBA").save(p, quality=84, method=6, alpha_quality=92)
    report(p)
    # позиция в % от кадра двери — для CSS (#door-smile)
    pos = dict(left=x0 / W * 100, top=y0 / H * 100, width=(x1 - x0) / W * 100, height=(y1 - y0) / H * 100)
    print("  #door-smile: " + "; ".join(f"{k_}:{v:.3f}%" for k_, v in pos.items()))
    return pos

if ONLY in ("all", "photo"): photo()
if ONLY in ("all", "smile"): door_smile(f32(Image.open(RAW / "new/pg-021-090.jpg").convert("RGB")))
