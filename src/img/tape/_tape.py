#!/usr/bin/env python3
"""GRINCHIN v3 · фирменные ленты (K3). Детерминирован: python3 src/img/tape/_tape.py (из site/).

Как на упаковке (Grinchin2.pdf стр. 12, g2_12.jpg): лайм #8ED308 с чёрной печатью GRiNCHiN и чёрная с лаймовой печатью.
Материал — НАСТОЯЩИЙ скан мятой ленты (assets/brand_raster/old/p-009-058.jpg): из него берутся форма (альфа с рваными
волокнами), заломы (карта светотени) и блики; печать гнётся вместе с лентой (рецепт v2/audit/03_art_direction.md §2):
  цвет · печать (новое лого, только буквы, без улыбки) → × карта заломов (multiply) → + блики гребней (screen ~.5)
  → альфа скана; лайм «дышит» (на свету желтее, в складке темнее), чёрная — с серыми бликами плёнки.
Пишет (webp с альфой; размеры — для CSS --ar):
  lime-1.webp  кусок целиком, оба конца рваные, диагональный залом   black-1.webp  то же, чёрная
  lime-2.webp  рваный конец слева, срез ножом справа                 black-2.webp
  lime-3.webp  срез ножом слева, рваный конец справа                 black-3.webp
  lime-strip.webp / black-strip.webp — длинная бесшовная по X полоса (для бегущей ленты/крестов; концы — у потребителя)
"""
from __future__ import annotations
import pathlib, re, subprocess, tempfile, shutil
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = pathlib.Path(__file__).parent
SCAN = pathlib.Path.home() / "Проекты/GV/assets/brand_raster/old/p-009-058.jpg"
LOGO = pathlib.Path.home() / "Проекты/GV/v3/logo/logo_p1.svg"
CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

LIME = np.array([0x8E, 0xD3, 0x08]) / 255
LIME_HI = np.array([0xC8, 0xF0, 0x4A]) / 255      # на свету — к жёлтому
LIME_LO = np.array([0x4E, 0x80, 0x05]) / 255      # в складке
BLACK = np.array([0x14, 0x15, 0x14]) / 255

def save(arr: np.ndarray, name: str, q: int = 82) -> None:
    im = Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8))
    im.save(HERE / name, quality=q, method=6)
    print(f"tape/{name}  {im.width}x{im.height}  {(HERE / name).stat().st_size // 1024} КБ")

# ---------- 1. печать: буквы нового лого → маска (через headless Chrome) ----------
def letters_mask(h: int) -> np.ndarray:
    src = LOGO.read_text()
    ds = re.findall(r'<path[^>]*?d="([^"]+)"', src)
    ds = [d for d in ds if len(d) < 3000]            # первый (длинный) путь — улыбка с рожками, на ленте её нет
    nums = [float(v) for d in ds for v in re.findall(r"-?\d+(?:\.\d+)?", d)]
    xs, ys = nums[0::2], nums[1::2]
    x0, y0, x1, y1 = min(xs) - 4, min(ys) - 4, max(xs) + 4, max(ys) + 4
    w = round(h * (x1 - x0) / (y1 - y0))
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {x1 - x0} {y1 - y0}" width="{w}" height="{h}">'
           f'<rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" fill="#fff"/>'
           + "".join(f'<path d="{d}" fill="#000"/>' for d in ds) + "</svg>")
    tmp = pathlib.Path(tempfile.mkdtemp())
    (tmp / "l.html").write_text(f'<html><body style="margin:0">{svg}</body></html>')
    subprocess.run([CH, "--headless=new", "--disable-gpu", f"--user-data-dir={tmp}/p", "--hide-scrollbars",
                    f"--window-size={w},{h}", f"--screenshot={tmp}/l.png", "--virtual-time-budget=500", f"file://{tmp}/l.html"],
                   timeout=60, capture_output=True)
    m = 1 - np.asarray(Image.open(tmp / "l.png").convert("L")).astype(np.float32)[:h, :w] / 255
    shutil.rmtree(tmp, ignore_errors=True)
    return m

# ---------- 2. скан ленты: форма, заломы, блики ----------
def scan() -> tuple[np.ndarray, np.ndarray]:
    im = Image.open(SCAN).convert("L").rotate(-7.6, resample=Image.BICUBIC, expand=True, fillcolor=0)
    a = np.asarray(im).astype(np.float32) / 255
    mask = a > .09
    mask = ndimage.binary_fill_holes(ndimage.binary_opening(mask, iterations=2))
    lab, n = ndimage.label(mask); big = np.argmax(ndimage.sum(mask, lab, range(1, n + 1))) + 1; mask = lab == big
    ys, xs = np.where(mask)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; mask = mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    alpha = ndimage.gaussian_filter(mask.astype(np.float32), 1.0)
    return a, alpha

def band_edges(alpha: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Верх и низ ленты по каждому столбцу (сглажено) — по ним печать гнётся вслед за кромкой."""
    m = alpha > .5
    H, W = m.shape
    top = np.array([np.argmax(m[:, x]) if m[:, x].any() else 0 for x in range(W)], np.float32)
    bot = np.array([H - 1 - np.argmax(m[::-1, x]) if m[:, x].any() else H - 1 for x in range(W)], np.float32)
    good = (bot - top) > (bot - top).max() * .7
    xs = np.arange(W)
    top = np.interp(xs, xs[good], top[good]); bot = np.interp(xs, xs[good], bot[good])
    return ndimage.gaussian_filter1d(top, 40), ndimage.gaussian_filter1d(bot, 40)

def compose(tone: np.ndarray, alpha: np.ndarray, top, bot, kind: str, letters: np.ndarray, phase: float) -> np.ndarray:
    H, W = tone.shape
    flat = ndimage.gaussian_filter(tone, 30)
    shade = np.clip(tone / np.maximum(flat, .05), .55, 1.35)           # заломы: 1 — ровно, <1 — складка, >1 — гребень
    lit = np.clip(ndimage.gaussian_filter(tone, 2) / max(np.percentile(tone[alpha > .5], 97), .1), 0, 1.2)
    # печать: буквы по высоте ≈ 60 % ленты, бегут по длине, повтор с зазором; координата v — поперёк ленты
    lh, lw = letters.shape
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    v = (yy - top[None, :]) / np.maximum(bot - top, 1)[None, :]
    bh = (bot - top).mean(); k = bh * .6 / lh                           # масштаб букв к ленте
    period = lw * k + bh * .5
    u = ((xx + phase * period) % period) / k                            # координата внутри одного «GRiNCHiN»
    vv = (v - .2) / .6 * lh
    inside = (u < lw - 1) & (vv >= 0) & (vv < lh - 1)
    ui = np.clip(u, 0, lw - 1).astype(int); vi = np.clip(vv, 0, lh - 1).astype(int)
    ink = np.where(inside, letters[vi, ui], 0)
    ink = ndimage.gaussian_filter(ink, .6) * .95
    if kind == "lime":
        base = LIME[None, None, :] * np.ones((H, W, 1))
        t = np.clip((shade - 1) * 2.2, -1, 1)[..., None]
        base = np.where(t > 0, base + (LIME_HI - LIME) * t, base + (LIME - LIME_LO) * t)
        col = base * (1 - ink[..., None]) + BLACK * ink[..., None]
        col = col * np.clip(shade, .7, 1.1)[..., None]
        hi = np.clip((lit - .95) * 3, 0, 1)[..., None] * .35
        col = col + (1 - col) * hi
    else:
        base = BLACK[None, None, :] * np.ones((H, W, 1))
        col = base * (1 - ink[..., None]) + LIME * ink[..., None] * .96
        col = col * np.clip(shade, .75, 1.15)[..., None]
        hi = np.clip((shade - 1.02) * 2.4, 0, 1)[..., None] * .55     # блик плёнки на гребнях — серый
        col = col + (np.array([.62, .63, .62]) - col) * hi
    a = alpha * (.97 if kind == "lime" else .99)
    return np.dstack([np.clip(col, 0, 1), a])

def resize(arr: np.ndarray, w: int) -> np.ndarray:
    im = Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8))
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    return np.asarray(im).astype(np.float32) / 255

def main() -> None:
    tone, alpha = scan()
    H, W = tone.shape
    top, bot = band_edges(alpha)
    letters = letters_mask(260)
    print("скан", W, H, "лента ≈", int((bot - top).mean()), "px")
    # куски: [x0, x1) по длине скана; срез «ножом» — прямой край там, где режем не по натуральному концу
    cuts = {"1": (0, W), "2": (0, int(W * .62)), "3": (int(W * .4), W)}
    for kind in ("lime", "black"):
        for name, (c0, c1) in cuts.items():
            ph = {"1": .15, "2": .55, "3": .35}[name] + (.2 if kind == "black" else 0)
            rgba = compose(tone[:, c0:c1], alpha[:, c0:c1], top[c0:c1], bot[c0:c1], kind, letters, ph)
            ys = np.where(rgba[..., 3].max(1) > .02)[0]
            rgba = rgba[ys.min():ys.max() + 1]
            save(resize(rgba, 760 if name == "1" else 600), f"{kind}-{name}.webp")
        # длинная полоса: прямой участок середины, бесшовно по X (кроссфейд концов), печать с целым числом периодов
        x0, x1 = int(W * .52), int(W * .97)
        t0, b0 = int(top[x0:x1].max()) + 4, int(bot[x0:x1].min()) - 4
        seg_tone = tone[t0:b0, x0:x1]; seg_a = np.ones_like(seg_tone)
        f = 160; wgt = np.linspace(0, 1, f)[None, :]
        tl = seg_tone[:, :-f].copy(); tl[:, :f] = seg_tone[:, :f] * wgt + seg_tone[:, -f:] * (1 - wgt)
        Hs, Ws = tl.shape
        bh = Hs; k = bh * .6 / letters.shape[0]
        period = letters.shape[1] * k + bh * .5
        n = max(1, round(Ws / period)); scale = Ws / (n * period)                 # подгоняем длину под целые повторы
        lt = np.asarray(Image.fromarray((letters * 255).astype(np.uint8)).resize(
            (round(letters.shape[1] * scale), letters.shape[0]), Image.LANCZOS)).astype(np.float32) / 255
        rgba = compose(tl, seg_a[:, :-f], np.zeros(Ws), np.full(Ws, Hs - 1.0), kind, lt, 0)
        save(resize(rgba, 1200), f"{kind}-strip.webp", 80)

if __name__ == "__main__":
    main()
