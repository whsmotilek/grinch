#!/usr/bin/env python3
"""Ассеты финала страницы (K5): пакет для подписки и мятая бумага подвала.

  new/pg-020-088  пакет с лентой  → end/bag.{avif,jpg}         пакет БЕЗ ленты (ленты вынуты, место заполнено)
                                   → end/bag-tape-h.webp        нижняя (горизонтальная) лента, RGBA во весь кадр
                                   → end/bag-tape-d.webp        верхняя (диагональная) лента, RGBA во весь кадр
     Ленты — настоящие, из того же кадра: печать GRINCHIN, блики и вспышка свои. На сайте они «прилепляются»
     обратно на пакет; все три слоя одного размера, совмещение — просто inset:0.
  new/pg-011-014  мятая бумага    → end/paper.{avif,jpg}        один лист без плитки: освещение выровнено,
                                                                 справа — тот же лист, повёрнутый и сдвинутый (шов растушёван),
                                                                 тон наружки (#1e2b1c, overlay) запечён — в CSS без blend.
                                   → end/crease.{avif,jpg}           та же бумага в сером: светотень для лого (multiply),
                                                                 JS совмещает её с фоном — лого «напечатано» на этом листе.
Запуск: python3 src/img/end/_end.py
"""
from __future__ import annotations
import pathlib
import numpy as np
from PIL import Image
from scipy import ndimage as nd

R = pathlib.Path("/Users/mat/Проекты/GV/assets/brand_raster/new")
OUT = pathlib.Path(__file__).parent


def f32(im: Image.Image) -> np.ndarray:
    return np.asarray(im).astype(np.float32) / 255


def u8(a: np.ndarray) -> np.ndarray:
    return (np.clip(a, 0, 1) * 255 + .5).astype(np.uint8)


# ---------------------------------------------------------------- пакет
src = f32(Image.open(R / "pg-020-088.jpg").convert("RGB"))
H, W = src.shape[:2]
r, g, b = src[..., 0], src[..., 1], src[..., 2]
key = (g > .45) & (g - np.maximum(r, b) > .22)                       # зелёная ПВХ
tape = nd.binary_fill_holes(nd.binary_closing(key, np.ones((15, 15)), iterations=1))  # + чёрная печать внутри
tape = nd.binary_opening(tape, np.ones((5, 5)))
lab, n = nd.label(tape)
sizes = nd.sum(tape, lab, range(1, n + 1))
tape = lab == (1 + int(np.argmax(sizes)))

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
# горизонтальная полоса: верх/низ замерены по столбцам вне пересечения (x=450 → 397/517, x=1150 → 418/542)
top = 397 + (xx - 450) * (21 / 700)
bot = 517 + (xx - 450) * (25 / 700)
hband = (yy > top - 14) & (yy < bot + 14)
# диагональ: края замерены по строкам вне пересечения (y=150 → 542/682, y=700 → 941/1080)
dl = 542 + (yy - 150) * .7255
dr = 682 + (yy - 150) * .7236
dband = (xx > dl - 10) & (xx < dr + 10)
diag = tape & (~hband | dband)
horz = tape & hband & ~dband

# альфа: мягкий край в 1 px, как у настоящего среза
def soft(m: np.ndarray) -> np.ndarray:
    return np.clip(nd.gaussian_filter(m.astype(np.float32), .7) * 1.15, 0, 1)

a_d = soft(diag)
# нижняя лента под пересечением: в кадре её не видно — достраиваем по профилю чистого просвета
# между словами (x 655–680), со сдвигом по наклону полосы. Через ~0,3 с её всё равно накроет диагональ.
cross = hband & dband & (yy > top - 2) & (yy < bot + 2)
h_rgb = src.copy()
cols = slice(655, 681)
prof = np.zeros((H, 3), np.float32)
off0 = 397 + (668 - 450) * (21 / 700)
for y in range(H):
    prof[y] = src[y, cols].mean(0)
ys, xs = np.where(cross)
shift = (top[ys, xs] - off0)
sy = np.clip(np.round(ys - shift).astype(int), 0, H - 1)
h_rgb[ys, xs] = prof[sy]
a_h = soft(horz | cross)

# пакет без лент: заливка «тяни-толкай» по пирамиде только из тёмного пластика (без стены и зелёного отсвета)
# + зерно. Этот слой виден ~0,5 с, пока ленты не легли; копирование фактуры со сдвигом тащило штрихкод — отказались
hole = nd.binary_dilation(tape, np.ones((15, 15)))
lum = src.mean(2)
spill = (g - np.maximum(r, b)) > .04
known = ~hole & ~spill & (lum < .42)
def pushpull(img: np.ndarray, known: np.ndarray) -> np.ndarray:
    if min(img.shape[:2]) < 4:
        m = known[..., None]
        v = (img * m).sum((0, 1)) / max(m.sum(), 1)
        return np.where(m, img, v)
    k = known.astype(np.float32)[..., None]
    h2, w2 = (img.shape[0] + 1) // 2, (img.shape[1] + 1) // 2
    pad = lambda a: np.pad(a, ((0, h2 * 2 - a.shape[0]), (0, w2 * 2 - a.shape[1]), (0, 0)), mode="edge")
    ik, kk = pad(img * k), pad(k)
    s = ik.reshape(h2, 2, w2, 2, -1).sum((1, 3)); c = kk.reshape(h2, 2, w2, 2, 1).sum((1, 3))
    low = pushpull(np.where(c > 0, s / np.maximum(c, 1e-6), 0), c[..., 0] > 0)
    up = np.repeat(np.repeat(low, 2, 0), 2, 1)[: img.shape[0], : img.shape[1]]
    up = nd.uniform_filter(up, (3, 3, 1))
    return np.where(known[..., None], img, up)
fill = pushpull(src, known)
fl = fill.mean(2, keepdims=True)
fill = fl + (fill - fl) * .35                                          # пластик почти нейтральный
rng = np.random.default_rng(7)
grain = nd.gaussian_filter(rng.normal(0, 1, (H, W)).astype(np.float32), 1.1)[..., None] * .014
fill = np.clip(fill + grain, 0, 1)
feather = nd.gaussian_filter(hole.astype(np.float32), 2.5)[..., None]
base = src * (1 - feather) + fill * feather
base = np.where(nd.binary_dilation(hole, np.ones((5, 5)))[..., None], base, src)

SIZE = (1200, round(1200 * H / W))  # 1200×675: в вёрстке пакет ≤ 560 CSS px
Image.fromarray(u8(base)).resize(SIZE, Image.LANCZOS).save(OUT / "bag.avif", quality=50)
Image.fromarray(u8(base)).resize(SIZE, Image.LANCZOS).save(OUT / "bag.jpg", quality=80, optimize=True, progressive=True)
for name, rgb, a in (("bag-tape-h", h_rgb, a_h), ("bag-tape-d", src, a_d)):
    rgba = np.dstack([rgb, a])
    im = Image.fromarray(u8(rgba), "RGBA").resize(SIZE, Image.LANCZOS)
    im.save(OUT / f"{name}.webp", quality=82, method=6)
    print(name, im.getbbox())
# для отладки: собранный обратно кадр должен совпадать с исходником
chk = base * (1 - a_h[..., None]) + h_rgb * a_h[..., None]
chk = chk * (1 - a_d[..., None]) + src * a_d[..., None]
print("bag: max diff after recompose", float(np.abs(chk - src)[tape].max()), "mean", float(np.abs(chk - src).mean()))

# ---------------------------------------------------------------- бумага
p = f32(Image.open(R / "pg-011-014.jpg").convert("L"))[:, :672]
low = nd.gaussian_filter(p, 60)
p = np.clip(p / np.maximum(low, 1e-3) * .186, 0, 1)                   # выровнять свет: без светлой кромки скана
p = np.clip((p - .186) * 1.7 + .28, 0, 1)                              # контраст как у v1 (autocontrast, среднее .28)
# второй лист: тот же скан, повёрнутый на 180° и сдвинутый на полвысоты — без зеркальной «кляксы» и без повтора;
# шов — широкая растушёвка 300 px
q = np.roll(p[::-1, ::-1], p.shape[0] // 2, 0)
OV = 300
w = p.shape[1]
t = np.clip((np.arange(2 * w - OV) - (w - OV)) / OV, 0, 1)
t = t * t * (3 - 2 * t)
L = np.zeros((p.shape[0], 2 * w - OV), np.float32); Rr = np.zeros_like(L)
L[:, :w] = p; Rr[:, w - OV:] = q
sheet = L * (1 - t) + Rr * t                                           # 1044×954
# тон наружки v1: background-blend overlay бумаги поверх #1e2b1c → для тёмной подложки это 2·C·P
C = np.array([0x1e, 0x2b, 0x1c], np.float32) / 255
paper = np.clip(2 * C[None, None, :] * sheet[..., None], 0, 1)
pim = Image.fromarray(u8(paper))
pim.save(OUT / "paper.avif", quality=52)
pim.save(OUT / "paper.jpg", quality=80, optimize=True, progressive=True)
# светотень для лога: светлота того же листа (гамма .35 — краска светлая, заломы и сгибы читаются),
# зерно слегка сглажено, чтобы лого оставалось чётким. Сравнение вариантов — scratchpad cands*.jpg (K5, 09.10).
q = nd.gaussian_filter(sheet, .8)
cr = np.clip(q / np.percentile(q, 95), 0, 1) ** .35
ci = Image.fromarray(u8(cr))
ci.save(OUT / "crease.jpg", quality=58, optimize=True, progressive=True)
ci.convert("RGB").save(OUT / "crease.avif", quality=50)
for f in sorted(OUT.glob("*.*")):
    if f.suffix != ".py":
        print(f.name, Image.open(f).size, f.stat().st_size // 1024, "КБ")
