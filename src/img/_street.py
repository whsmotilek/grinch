#!/usr/bin/env python3
"""Итерация 2 (агент D): фактуры и кадры «улицы» из СОБСТВЕННЫХ материалов бренда.

Источники — ../../assets/brand_raster (растры, вынутые из PDF в нативном разрешении):
  old/p-009-058  мятая белая лента (3443 px)     → tape/white.webp, tape/crease.webp, tape/end-*.png
  old/p-019-128  буква I из скотча с пигментом   → tape/pigment.webp (фактура «скотч со снятым пигментом»)
  new/pg-011-014 мятая бумага наружки pres_11     → street/paper.webp
  new/pg-011-030, pg-011-012 граффити-слои pres_11 → street/tag-*.webp
  new/pg-021-090 дверь, GRINCHIN зелёным скотчем  → street/door.{avif,jpg} (CoreImage: _tools/enhance)
  new/pg-011-0xx модели в денимe (наружка pres_11) → street/model-hero.webp, street/look-03/04 (постеры)
  old/p-024-146/148 футболки (кампания)           → street/look-01/02
  old/p-017-116 буквы из скотча на листах          → street/making.{avif,jpg}
  old/p-016-114 улица                             → street/street.{avif,jpg}
Чужие мудборды (old/p-002…p-012, new/pg-018/019) НЕ используются.
Запуск: python3 src/img/_street.py (из site/). Детерминирован.
"""
from __future__ import annotations
import pathlib, subprocess
import numpy as np
from PIL import Image, ImageFilter, ImageOps
from scipy import ndimage

HERE = pathlib.Path(__file__).parent
RAW = HERE.parents[2] / "assets" / "brand_raster"
TOOLS = HERE.parents[2] / "_tools"
OUT_T = HERE / "tape"; OUT_S = HERE / "street"
OUT_T.mkdir(exist_ok=True); OUT_S.mkdir(exist_ok=True)
TMP = pathlib.Path("/tmp/gv_street"); TMP.mkdir(exist_ok=True)

def L(p): return np.asarray(Image.open(p).convert("L")).astype(np.float32) / 255
def rgb(p): return np.asarray(Image.open(p).convert("RGB")).astype(np.float32) / 255
def save(arr, path, **kw):
    im = arr if isinstance(arr, Image.Image) else Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8))
    im.save(path, **kw); print(f"{path.relative_to(HERE)}  {im.size[0]}x{im.size[1]}  {path.stat().st_size // 1024} КБ")
def smooth(x, a, b): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

# ---------- 1. белая мятая лента ----------
src = Image.open(RAW / "old/p-009-058.jpg").convert("L")
src = src.rotate(-7.6, resample=Image.BICUBIC, expand=True, fillcolor=0)
a = np.asarray(src).astype(np.float32) / 255
mask = a > .09
mask = ndimage.binary_fill_holes(ndimage.binary_opening(mask, iterations=2))
lab, n = ndimage.label(mask); big = np.argmax(ndimage.sum(mask, lab, range(1, n + 1))) + 1; mask = lab == big
ys, xs = np.where(mask); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
a = a[y0:y1 + 1, x0:x1 + 1]; mask = mask[y0:y1 + 1, x0:x1 + 1]
alpha = ndimage.gaussian_filter(mask.astype(np.float32), 1.2)
H, Wd = a.shape
print("tape piece", Wd, H)
# кусок целиком (держит фото, «заклеивает» текст): серый с альфой
tone = np.clip(a / np.percentile(a[mask], 92), 0, 1)
piece = Image.fromarray((np.dstack([tone, tone, tone, alpha]) * 255).astype(np.uint8), "RGBA")
piece = piece.resize((900, round(900 * H / Wd)), Image.LANCZOS)
save(piece, OUT_T / "white.webp", quality=78, method=6)

# карта заломов: прямой участок середины, нормирован к белому (для multiply поверх цвета), бесшовный по X
cov = mask.sum(0)
good = np.where(cov > .7 * cov.max())[0]
cx0, cx1 = int(good.min() + 60), int(good.max() - 60)
tops = np.array([np.where(mask[:, x])[0].min() for x in range(cx0, cx1, 20)])
bots = np.array([np.where(mask[:, x])[0].max() for x in range(cx0, cx1, 20)])
RT, RB = int(tops.max()) + 6, int(bots.min()) - 6
band = a[RT:RB, cx0:cx1]
band = band / np.percentile(band, 90)
band = np.clip(band, 0, 1.15)
hh = 128; ww = round(band.shape[1] * hh / band.shape[0])
bim = Image.fromarray(np.clip(band / 1.15 * 255, 0, 255).astype(np.uint8)).resize((ww, hh), Image.LANCZOS)
b = np.asarray(bim).astype(np.float32) / 255 * 1.15
f = 90  # шов: кроссфейд концов
w = np.linspace(0, 1, f)[None, :]
b2 = b[:, :-f].copy(); b2[:, :f] = b[:, :f] * w + b[:, -f:] * (1 - w)
lo = np.percentile(b2, 2)
crease = np.clip((b2 - lo) / (1 - lo) * .55 + .45, 0, 1)  # мягче: 45–100 %
save(crease, OUT_T / "crease.webp", quality=80, method=6)

# рваные концы — маски (белое = лента). Берём натуральные края куска, высота 128
def end_mask(side):
    m = mask.astype(np.float32)
    cut = int((RB - RT) * .6)
    part = m[:, :cut] if side == "l" else m[:, -cut:]
    # вертикальные края куска не нужны — дотягиваем верх/низ до полной полосы внутри маски
    part = part[RT:RB]
    part = ndimage.gaussian_filter(part, .8)
    im = Image.fromarray((part * 255).astype(np.uint8)).resize((round(part.shape[1] * 128 / part.shape[0]), 128), Image.LANCZOS)
    return im
for s in "lr":
    im = end_mask(s)
    arr = np.asarray(im).astype(np.float32) / 255
    # гарантия: внутренний край — сплошной (стыкуется с центральной заливкой)
    if s == "l": arr[:, -6:] = 1
    else: arr[:, :6] = 1
    rgba = np.dstack([np.zeros_like(arr)] * 3 + [arr])
    save(Image.fromarray((rgba * 255).astype(np.uint8), "RGBA"), OUT_T / f"end-{s}.png", optimize=True)

# ---------- 2. скотч с пигментом (буква I) ----------
pi = Image.open(RAW / "old/p-019-128.jpg").convert("L")
pa = np.asarray(pi).astype(np.float32) / 255
# сама полоса: темнее фона-бумаги
dark = ndimage.gaussian_filter(pa, 6) < .62
cols = np.where(dark.mean(0) > .5)[0]; rws = np.where(dark[:, cols.min():cols.max()].mean(1) > .5)[0]
strip = pa[rws.min() + 30: rws.max() - 30, cols.min() + 25: cols.max() - 25]
strip = np.rot90(strip, -1)  # горизонтально
st = Image.fromarray((strip * 255).astype(np.uint8))
st = st.resize((round(st.width * 128 / st.height), 128), Image.LANCZOS)
st = ImageOps.autocontrast(st, cutoff=1)
# тёмная лента: пигмент почти чёрный, просветы плёнки — серые (иначе зелёный текст не читается)
st = Image.fromarray((((np.asarray(st).astype(np.float32) / 255) ** 1.5 * .42) * 255).astype(np.uint8))
save(st, OUT_T / "pigment.webp", quality=60, method=6)

# ---------- 3. мятая бумага pres_11 (бесшовная зеркальная плитка) ----------
pp = Image.open(RAW / "new/pg-011-014.jpg").convert("L")
pp = pp.crop((8, 6, int(pp.width * .935), pp.height - 6))       # справа у скана светлая кромка — срезаем
pa_ = np.asarray(ImageOps.autocontrast(pp, cutoff=.5)).astype(np.float32) / 255
h_, w_ = pa_.shape
sh = np.roll(np.roll(pa_, h_ // 2, 0), w_ // 2, 1)              # бесшовность: смесь с копией, сдвинутой на полплитки
yy, xx = np.mgrid[0:h_, 0:w_]
wgt = np.minimum(np.minimum(xx, w_ - 1 - xx) / (w_ * .5), np.minimum(yy, h_ - 1 - yy) / (h_ * .5))
wgt = smooth(wgt, .0, .35)
tile = pa_ * wgt + sh * (1 - wgt)
tile = (tile - tile.mean()) * 1.15 + tile.mean()
save(Image.fromarray((np.clip(tile, 0, 1) * 255).astype(np.uint8)).resize((w_ * 3 // 4, h_ * 3 // 4), Image.LANCZOS), OUT_S / "paper.webp", quality=42, method=6)
paper_full = np.asarray(ImageOps.autocontrast(Image.open(RAW / "new/pg-011-014.jpg").convert("L").crop((0, 0, 690, 954)), cutoff=.5)).astype(np.float32) / 255

# ---------- 4. граффити-слои pres_11 (чёрная краска с альфой) ----------
def tag(name, out, gamma=.55, width=900):
    m = L(RAW / f"new/{name}.jpg"); m = np.clip(m / max(m.max(), 1e-3), 0, 1) ** gamma
    m = ndimage.gaussian_filter(m, .6)
    im = Image.fromarray((np.dstack([np.zeros_like(m)] * 3 + [m]) * 255).astype(np.uint8), "RGBA")
    im = im.resize((width, round(width * im.height / im.width)), Image.LANCZOS)
    save(im, OUT_S / out, quality=50, method=6)
tag("pg-011-030", "tag-spray.webp", width=720)
tag("pg-011-012", "tag-scrawl.webp", width=720)

# ---------- 5. вырезка моделей (фон — чистый чёрный) ----------
def cutout(name):
    im = rgb(RAW / f"new/{name}.jpg")
    mx = im.max(2)
    bg = mx < .035
    lab, _ = ndimage.label(bg)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgm = np.isin(lab, list(border))
    # замкнутые «окна» фона (между ног, под локтем): крупные и совсем чёрные области
    sizes = ndimage.sum(bg, lab, range(1, lab.max() + 1))
    holes = [i + 1 for i, sz in enumerate(sizes) if sz > 900 and (i + 1) not in border]
    if holes:
        hm = np.isin(lab, holes) & (mx < .02)
        bgm |= ndimage.binary_opening(hm, iterations=2)
    fg = ~bgm
    fg = ndimage.binary_opening(fg, iterations=1)
    al = ndimage.gaussian_filter(fg.astype(np.float32), 1.0)
    return im, al
def poster(name, out, size=(800, 1000), scale=.98, dy=.03, seed=0):
    im, al = cutout(name)
    W_, H_ = size
    # бумага → зелёная наружка (pres_11): тёмно-лесной тон, заломы светлые
    pap = np.asarray(Image.fromarray((paper_full * 255).astype(np.uint8)).resize(size, Image.LANCZOS)).astype(np.float32) / 255
    rng = np.random.default_rng(seed)
    if seed % 2: pap = pap[:, ::-1]
    c0 = np.array([.035, .085, .035]); c1 = np.array([.27, .40, .25])
    base = c0 + (c1 - c0) * (pap[..., None] ** 1.15)
    # модель
    mh = int(H_ * scale); mw = round(im.shape[1] * mh / im.shape[0])
    mi = np.asarray(Image.fromarray((im * 255).astype(np.uint8)).resize((mw, mh), Image.LANCZOS)).astype(np.float32) / 255
    ma = np.asarray(Image.fromarray((al * 255).astype(np.uint8)).resize((mw, mh), Image.LANCZOS)).astype(np.float32) / 255
    # печать на мятой бумаге: модель чуть притушена, заломы бумаги проступают
    grey = mi.mean(2, keepdims=True)
    mi = mi * .78 + grey * .22
    ox = (W_ - mw) // 2; oy = H_ - mh + int(H_ * dy)
    out_img = base.copy()
    ys0, ys1 = max(oy, 0), min(oy + mh, H_); xs0, xs1 = max(ox, 0), min(ox + mw, W_)
    sub = mi[ys0 - oy: ys1 - oy, xs0 - ox: xs1 - ox]; sa = ma[ys0 - oy: ys1 - oy, xs0 - ox: xs1 - ox, None]
    pp_ = pap[ys0:ys1, xs0:xs1, None]
    printed = sub * (.62 + .55 * pp_)            # заломы бумаги поверх печати
    printed = printed * np.array([.9, 1.0, .9])  # лёгкий зелёный отлив, как в pres_11
    out_img[ys0:ys1, xs0:xs1] = out_img[ys0:ys1, xs0:xs1] * (1 - sa) + printed * sa
    # граффити поверх (чёрная краска)
    for tname, sc, px, py, op in (("pg-011-030", .95, -.05, .62, .9), ("pg-011-012", .8, .25, -.02, .75))[seed % 2: seed % 2 + 1] + (("pg-011-016", .9, .1, .35, .55),):
        t = L(RAW / f"new/{tname}.jpg"); t = np.clip(t / max(t.max(), 1e-3), 0, 1) ** .5
        tw_ = int(W_ * sc); th_ = round(t.shape[0] * tw_ / t.shape[1])
        t = np.asarray(Image.fromarray((t * 255).astype(np.uint8)).resize((tw_, th_), Image.LANCZOS)).astype(np.float32) / 255
        X = int(W_ * px); Y = int(H_ * py)
        y0_, y1_ = max(Y, 0), min(Y + th_, H_); x0_, x1_ = max(X, 0), min(X + tw_, W_)
        if y1_ <= y0_ or x1_ <= x0_: continue
        tt = t[y0_ - Y: y1_ - Y, x0_ - X: x1_ - X, None] * op
        out_img[y0_:y1_, x0_:x1_] *= (1 - tt)
    # виньетка + зерно
    yy, xx = np.mgrid[0:H_, 0:W_]; d = np.hypot((xx - W_ / 2) / W_, (yy - H_ / 2) / H_)
    out_img *= (1 - .55 * smooth(d, .3, .75))[..., None]
    out_img += rng.normal(0, .018, out_img.shape[:2])[..., None]
    o = Image.fromarray((np.clip(out_img, 0, 1) * 255).astype(np.uint8))
    o.save(OUT_S / f"{out}.avif", quality=48); o.save(OUT_S / f"{out}.jpg", quality=78, optimize=True, progressive=True)
    print(out, (OUT_S / f"{out}.avif").stat().st_size // 1024, "КБ avif /", (OUT_S / f"{out}.jpg").stat().st_size // 1024, "КБ jpg")

poster("pg-011-018", "look-03", seed=1)
poster("pg-011-010", "look-04", seed=2)

# модель для hero — вырезка с альфой (композиция собирается в CSS поверх бумаги)
im, al = cutout("pg-011-024")
hh = 1100; ww = round(im.shape[1] * hh / im.shape[0])
grey = im.mean(2, keepdims=True); im2 = im * .85 + grey * .15
rgba = np.dstack([im2, al])
mo = Image.fromarray((rgba * 255).astype(np.uint8), "RGBA").resize((ww, hh), Image.LANCZOS)
save(mo, OUT_S / "model-hero.webp", quality=72, method=6)

# ---------- 6. кадры кампании (фото) ----------
def photo(src_, out, box=None, size=None, grade=True, q=(56, 78)):
    im = Image.open(RAW / src_).convert("RGB")
    if box: im = im.crop(box)
    if size: im = ImageOps.fit(im, size, Image.LANCZOS, centering=(.5, .5)) if isinstance(size, tuple) else im.resize((size, round(size * im.height / im.width)), Image.LANCZOS)
    if grade:  # общий грейд «улицы»: чуть приглушить насыщенность, тени в зелень
        a_ = np.asarray(im).astype(np.float32) / 255
        g = a_.mean(2, keepdims=True); a_ = a_ * .82 + g * .18
        sh = (1 - g) ** 2; a_ = a_ + sh * np.array([-.02, .015, -.02])
        im = Image.fromarray((np.clip(a_, 0, 1) * 255).astype(np.uint8))
    im.save(OUT_S / f"{out}.avif", quality=q[0]); im.save(OUT_S / f"{out}.jpg", quality=q[1], optimize=True, progressive=True)
    print(out, im.size, (OUT_S / f"{out}.avif").stat().st_size // 1024, "КБ avif /", (OUT_S / f"{out}.jpg").stat().st_size // 1024, "КБ jpg")

photo("old/p-024-146.jpg", "look-01", size=(800, 1000))
photo("old/p-024-148.jpg", "look-02", size=(800, 1000))
photo("old/p-017-116.jpg", "making", box=(0, 0, 3896, 1460), size=1400)
photo("old/p-016-114.jpg", "street", size=1600, q=(40, 68))

# дверь: CoreImage-обработка (шумодав + резкость), без апскейла — в PDF больше 1448 px нет
door_png = TMP / "door.png"
subprocess.run([str(TOOLS / "enhance"), str(RAW / "new/pg-021-090.jpg"), str(door_png), "0.025", "0.55", "1.0"], check=True)
d = Image.open(door_png).convert("RGB")
d.save(OUT_S / "door.avif", quality=46); d.save(OUT_S / "door.jpg", quality=74, optimize=True, progressive=True)
print("door", d.size, (OUT_S / "door.avif").stat().st_size // 1024, "КБ avif /", (OUT_S / "door.jpg").stat().st_size // 1024, "КБ jpg")
