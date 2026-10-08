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
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

HERE = pathlib.Path(__file__).parent
RAW = HERE.parents[2] / "assets" / "brand_raster"
OUT_T = HERE / "tape"; OUT_S = HERE / "street"
OUT_T.mkdir(exist_ok=True); OUT_S.mkdir(exist_ok=True)
FONT = "/System/Library/Fonts/HelveticaNeue.ttc"   # Bold (index 1) — нейтральный гротеск, как печать на пакете pres_20
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

    def straight(out_h: int, pad: float):
        """Распрямлённая полоса W0×out_h: гладкие кромки → горизонтали на pad·h от краёв растра.
        Натуральные концы и мелкая волна кромки сохраняются."""
        t = (np.linspace(0, 1, out_h)[:, None] - pad) / (1 - 2 * pad)
        sy = TOP[None, :] + t * (BOT - TOP)[None, :]
        sx = np.broadcast_to(cols[None, :].astype(float), sy.shape)
        return (ndimage.map_coordinates(LUM, [sy, sx], order=1, mode="nearest"),
                ndimage.map_coordinates(A0, [sy, sx], order=1, mode="constant", cval=0))

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

    # ---------- 1b. зелёная фирменная ----------
    GREEN = np.array([0x19, 0xE8, 0x3A]) / 255     # лента на свету (pres_20 ≈ #3FF835; токен #00DB24)
    INK = np.array([0x06, 0x10, 0x06]) / 255
    HI = np.array([.88, 1.0, .76])                  # блик флуоресцентной плёнки уходит в жёлто-белый

    def green(name, length, thick, seed, *, src=(0., 1.), flip=False, vflip=False, k=.8, cut="nat", phase=.3):
        """length×thick — px растра (2× от CSS). src — участок скана, k — сила заломов (натянутая длинная мнётся меньше)."""
        pad = .1
        oh = round(thick / (1 - 2 * pad))
        lum, al = straight(round(THICK / (1 - 2 * pad)), pad)
        x0, x1 = int(W0 * src[0]), int(W0 * src[1])
        lum, al = lum[:, x0:x1], al[:, x0:x1]
        if flip: lum, al = lum[:, ::-1], al[:, ::-1]
        if vflip: lum, al = lum[::-1], al[::-1]
        lum = resize(lum, length, oh); al = np.clip(resize(al, length, oh), 0, 1)
        if cut == "tear-l": al = torn_edge(al, "l", seed, thick * .12, .06)
        elif cut == "knife-l":                                         # ровный срез ножом, чуть наискось
            x = np.arange(length)[None, :]
            al = al * smooth(x - (thick * .2 + np.linspace(0, thick * .3, oh)[:, None]), 0, 1.4)
        xx = np.linspace(0, 1, length)[None, :]
        # заломы при уменьшении скана в 7 раз «съедаются» — поднимаем деталь (яркость / её размытие)
        det = lum / np.maximum(ndimage.gaussian_filter(lum, (thick * .5, thick * 1.5)), 1e-3)
        low = ndimage.gaussian_filter(lum, (thick * .5, thick * 1.5))
        s = 1 + ((det - 1) * 1.7 + (low - 1) * .6) * k * (.6 + .4 * smooth(np.abs(xx - .5), .15, .5))
        s = ndimage.gaussian_filter(s, .6)
        # свет вдоль ленты не ровный: плёнка слегка волнится — широкие пологие перепады ±7 %
        rngL = np.random.default_rng(seed + 50)
        wave = ndimage.gaussian_filter1d(rngL.normal(0, 1, length), thick * 2.2); wave = wave / (np.abs(wave).max() + 1e-6)
        s = s * (1 + .07 * wave[None, :])
        # печать: GRINCHIN гротеском, высота букв ≈ 30 % ширины ленты, пробел ≈ 0,6 ширины — как на пакете
        ink = Image.new("L", (length, oh), 0); dr = ImageDraw.Draw(ink)
        fs = round(thick * .42); font = ImageFont.truetype(FONT, fs, index=1)
        word = "GRINCHIN"; tr = fs * .035
        ww = sum(dr.textlength(c, font=font) for c in word) + tr * (len(word) - 1)
        gap = thick * .64
        bb = font.getbbox("GRINCHIN"); cy = oh / 2 - (bb[1] + bb[3]) / 2
        x = -ww * phase
        while x < length:
            cx = x
            for ch in word:
                dr.text((cx, cy), ch, font=font, fill=255); cx += dr.textlength(ch, font=font) + tr
            x += ww + gap
        T = f32(ink)
        # буквы мнутся вместе с лентой: смещение по градиенту светотени, краска стирается на гребнях
        gy, gx = np.gradient(ndimage.gaussian_filter(s, 2.5))
        yy, xg = np.mgrid[0:oh, 0:length].astype(np.float32)
        T = ndimage.map_coordinates(T, [yy - gy * thick * .4, xg - gx * thick * .4], order=1)
        rng = np.random.default_rng(seed)
        wear = ndimage.gaussian_filter(rng.random((oh, length)), 1.0)
        T = np.clip(T * (1 - .25 * smooth(s, 1.06, 1.25)) * (.9 + .2 * (wear - .5)), 0, 1) * .97
        base = GREEN * (1 - T[..., None]) + INK * T[..., None]
        # цвет ПОД светотенью: складки → глубокий зелёный (#0C8E1E), гребни → блик
        col = base * (np.clip(s, .3, 1.0) ** 1.4)[..., None]
        hi = (smooth(s, 1.03, 1.25) * .55)[..., None]
        col = col + (1 - col) * hi * HI
        # глянец ПВХ: мягкая полоса блика там, где плёнка выгибается к свету (немного — не «неон»)
        bend = ndimage.gaussian_filter(s, thick * .35) - ndimage.gaussian_filter(s, thick * 1.6)
        col = col + (1 - col) * (smooth(bend, .015, .07) * .28)[..., None] * HI
        # кромка: верхняя ловит свет, нижняя чуть темнее — лента читается на чёрном без «неона»
        e = ndimage.gaussian_filter((al > .5).astype(np.float32), 1.0)
        g = np.gradient(e, axis=0)
        col = col * (1 - np.clip(-g * 2.4, 0, .4))[..., None] + (np.clip(g * 1.4, 0, .22))[..., None]
        save_rgba(trim(np.dstack([np.clip(col, 0, 1), al * .99])), OUT_T / f"{name}.webp", q=84)

    print("лента: зелёная")
    # hero: запечатывает нижний правый угол; виден левый (натуральный) конец, правая часть уходит за край
    green("green-1", 1500, 96, 11, src=(0., 1.), k=1.0, cut="nat", phase=.55)
    # K5 — пакет крест-накрест: два куска с разным рисунком заломов
    green("green-2", 1100, 88, 12, src=(.0, .82), flip=True, k=1.0, cut="knife-l", phase=.15)
    green("green-3", 900, 88, 13, src=(.28, 1.), vflip=True, k=1.1, cut="tear-l", phase=.7)

if ONLY in ("all", "tape"): tape()

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
    save_photo(grade(a), "hero", (1024, 640), q_avif=60)
    # образы
    for src, name, widths in (("new/pg-011-010.jpg", "look-a", (960, 480)), ("new/pg-011-024.jpg", "look-b", (960, 480))):
        a, nf = defringe(rgbf(src)); print(f"  {name}: ореол {nf} px")
        save_photo(grade(a), name, widths)
    save_photo(grade(rgbf("new/pg-015-038.jpg"), sat=.9, tint=.01), "look-c", (960, 480))
    save_photo(grade(rgbf("new/pg-020-088.jpg"), sat=.92, tint=.01), "bag", (1280, 640))
    # знак: дверь — без грейда/резкости (исходник 1448 px, на сайте ≤ 960 CSS px)
    save_photo(rgbf("new/pg-021-090.jpg"), "door", (1448, 800), q_avif=50, q_jpg=76)
    # N в трёх стадиях: наклеили (122) → сорвали (118) → скан (120). Сканы ч/б — только пережатие
    for i, n in enumerate(("old/p-018-122.jpg", "old/p-018-118.jpg", "old/p-018-120.jpg"), 1):
        save_photo(rgbf(n), f"n-{i}", (840, 420), q_avif=54, q_jpg=78)

if ONLY in ("all", "photo"): photo()
