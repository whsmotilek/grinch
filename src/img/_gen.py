#!/usr/bin/env python3
"""Эскизы вещей дропа 01 (K1). Пишет src/img/<id>-1.svg (вещь спереди) и -2.svg (деталь крупно).

Задача — спокойный дорогой плейсхолдер до съёмки: тонкая линия силуэта, лёгкий тон цвета вещи,
строчка пунктиром. Никаких лент, надписей, рамок, выносок и шума. Фон прозрачный — бумагу даёт карточка.
Деталь — тот же рисунок в кадре ×2,4: линия той же толщины (non-scaling-stroke), поэтому смена кадра
на hover читается как «подошли ближе», а не как другая картинка.
Запуск: python3 src/img/_gen.py  (детерминирован)."""
from __future__ import annotations
import math, random, pathlib

OUT = pathlib.Path(__file__).parent
INK = "#161616"
RED = "#C2342C"
W, H = 400, 500

def stroke(d: str, w: float = 1.25, c: str = INK, o: float = 1, dash: str = "", cap: str = "round") -> str:
    da = f' stroke-dasharray="{dash}"' if dash else ""
    op = f' opacity="{o}"' if o != 1 else ""
    return (f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="{cap}" '
            f'stroke-linejoin="round" vector-effect="non-scaling-stroke"{da}{op}/>')

def body(outline: str, tone: str, tone_o: float, clip: str) -> str:
    """Силуэт: заливка тоном + контур. clipPath — чтобы детали не вылезали за край вещи."""
    return (f'<clipPath id="{clip}"><path d="{outline}"/></clipPath>'
            f'<path d="{outline}" fill="{tone}" fill-opacity="{tone_o}"/>')

def outline(d: str) -> str:
    return stroke(d, 1.35)

def seams(d: str) -> str:
    return stroke(d, 1, o=.34)

def stitch(d: str, c: str = INK, o: float = .42) -> str:
    return stroke(d, 1, c=c, o=o, dash="3 3", cap="butt")

# ---------- силуэты, координаты 400×500 ----------
JEANS = ("M128 62 L272 62 L276 86 C290 206 306 330 318 448 L214 454 L200 196 L186 454 "
         "L82 448 C94 330 110 206 124 86 Z")
JEANS_SEAMS = ("M124 86 L276 86 M200 86 L200 190 "
               "M130 94 C146 120 166 124 176 88 M270 94 C254 120 234 124 224 88 "
               "M152 206 C146 300 140 384 134 446 M248 206 C254 300 260 384 266 446")
JEANS_STITCH = ("M126 74 L274 74 M210 88 L210 156 C210 168 205 176 200 180 "
                "M88 432 L189 438 M211 438 L312 432 M240 96 L258 96 L257 112 L241 112 Z")
LOOPS = "".join(stroke(f"M{x} 62 L{x} 86", 1, o=.5) for x in (142, 170, 230, 258))

JACKET = ("M164 92 L108 108 C88 162 76 262 70 362 L104 368 L118 232 L120 404 L280 404 L282 232 "
          "L296 368 L330 362 C324 262 312 162 292 108 L236 92 Z")
COLLAR = "M164 62 L236 62 L240 96 L160 96 Z"
JACKET_SEAMS = ("M118 232 C116 200 112 160 108 110 M282 232 C284 200 288 160 292 110 "
                "M120 386 L280 386 M70 344 L104 350 M296 350 L330 344")
PANEL_SIDE = "M108 108 C140 150 150 200 146 270 L118 280 L118 232 Z M292 108 C260 150 250 200 254 270 L282 280 L282 232 Z"
PANEL_LOW = "M120 404 L120 300 C150 262 178 252 200 256 C222 252 250 262 280 300 L280 404 Z"

HOOD = "M142 118 C128 66 160 34 200 34 C240 34 272 66 258 118"
HOODIE = ("M142 106 L96 124 C80 200 72 300 66 394 L102 400 L116 252 L118 424 L282 424 L284 252 "
          "L298 400 L334 394 C328 300 320 200 304 124 L258 106 C246 118 224 124 200 124 C176 124 154 118 142 106 Z")
HOODIE_SEAMS = ("M118 404 L282 404 M66 376 L102 382 M298 382 L334 376 "
                "M116 252 C114 210 108 170 98 128 M284 252 C286 210 292 170 302 128")

BIKER = ("M156 90 L104 108 C86 170 78 270 72 380 L108 386 L120 242 L122 406 L278 406 L280 242 "
         "L292 386 L328 380 C322 270 314 170 296 108 L244 90 Z")
BIKER_HOOD = "M150 94 C140 52 170 30 200 30 C230 30 260 52 250 94"
BIKER_SEAMS = ("M160 92 L180 162 L216 178 M244 92 L230 150 L262 168 "
               "M120 242 C118 200 112 160 104 112 M280 242 C282 200 288 160 296 112 "
               "M72 358 L108 364 M292 364 L328 358 M122 386 L278 386")
BIKER_ZIP = "M232 110 C214 200 170 300 158 404"

TEE = ("M150 66 C170 82 230 82 250 66 L316 92 L340 168 L300 182 L290 148 L290 420 L110 420 "
       "L110 148 L100 182 L60 168 L84 92 Z")
TEE_SEAMS = "M150 66 C170 94 230 94 250 66 M110 148 L84 92 M290 148 L316 92"
TEE_STITCH = "M112 406 L288 406 M154 70 C172 88 228 88 246 70 M298 176 L304 164 M102 176 L96 164"

LONG = ("M150 66 C170 82 230 82 250 66 L300 90 C318 180 330 300 336 404 L302 410 L288 170 L288 420 "
        "L112 420 L112 170 L98 410 L64 404 C70 300 82 180 100 90 Z")
LONG_SEAMS = ("M150 66 C170 94 230 94 250 66 "
              "M112 170 C110 148 106 118 100 92 M288 170 C290 148 294 118 300 92")
LONG_STITCH = "M114 406 L286 406 M66 380 L100 386 M300 386 L334 380 M154 70 C172 88 228 88 246 70"

G_PATH = ("M253 146c0 14-3 28-8 41 -5 13-12 25-20 35 -10 12-22 21-36 28 -15 6-32 10-52 10 -18 0-35-3-52-9 -16-5-30-14-43-25 "
          "-12-11-22-25-29-41 -7-17-11-35-11-54 0-19 4-37 11-54 7-16 17-30 30-41 13-11 28-20 45-25 18-6 37-9 56-9 26 0 49 4 69 13 "
          "18 7 34 19 47 34 12 14 19 31 22 50l-56 0c-2-10-7-19-15-26 -8-8-17-14-28-17 -12-4-26-6-39-6 -17 0-32 3-45 9 -12 6-23 16-29 28 "
          "-7 12-11 27-11 44 0 17 4 32 11 45 7 12 16 21 29 28 14 6 28 10 46 10 18 0 30-3 43-9 13-6 22-15 29-26 8-11 9-20 12-33zm-99 24l0-40 128 0 0 125 -40 0 0-85z")

def jacquard(x: float, y: float, s: float = 13) -> str:
    """Жаккардовая бирка с G у подола — единственная «надпись», и та — знак."""
    k = s * .62 / 284
    gx, gy = x + (s - 284 * k) / 2, y + (s - 262 * k) / 2
    return (f'<rect x="{x}" y="{y}" width="{s}" height="{s}" fill="{INK}"/>'
            f'<path d="{G_PATH}" fill="#00DB24" transform="translate({gx:.2f} {gy:.2f}) scale({k:.4f})"/>')

def smooth_loop(rng: random.Random, cx: float, cy: float, r: float) -> str:
    """Одна петля «каракули» — гладкая, без дребезга."""
    pts = []
    n = 7
    for i in range(n):
        a = i / n * math.tau + rng.uniform(-.3, .3)
        rr = r * rng.uniform(.6, 1.25)
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr * 1.5))
    d = f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"
    for i in range(1, n + 1):
        p0, p1 = pts[(i - 1) % n], pts[i % n]
        mx, my = (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2
        d += f" Q{p0[0]:.1f} {p0[1]:.1f} {mx:.1f} {my:.1f}"
    return d

def crack(rng: random.Random, x: float, y: float) -> str:
    ang = rng.uniform(-.5, .5) + (0 if rng.random() > .5 else math.pi)
    d = f"M{x:.0f} {y:.0f}"
    for _ in range(rng.randint(5, 8)):
        ang += rng.uniform(-.6, .6)
        ln = rng.uniform(9, 18)
        x, y = x + math.cos(ang) * ln, y + math.sin(ang) * ln
        d += f" L{x:.0f} {y:.0f}"
    return d

def svg(content: str, crop: tuple[float, float, float, float] | None = None) -> str:
    vb = "0 0 400 500" if crop is None else " ".join(f"{v:g}" for v in crop)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="800" height="1000" '
            f'preserveAspectRatio="xMidYMid slice">{content}</svg>')

def crop_at(cx: float, cy: float, zoom: float = 2.4) -> tuple[float, float, float, float]:
    w, h = W / zoom, H / zoom
    return (round(cx - w / 2, 1), round(cy - h / 2, 1), round(w, 1), round(h, 1))

def build() -> dict[str, tuple[str, tuple[float, float, float, float]]]:
    rng = random.Random(11)
    items: dict[str, tuple[str, tuple[float, float, float, float]]] = {}

    # 01 · Джинсы RESTART — чёрный деним, красный принт от руки (стрелки и росчерк)
    red = (stroke("M150 210 C146 270 142 330 140 392 M128 372 L140 396 L154 374", 1.4, RED) +
           stroke("M250 210 C254 270 258 330 260 392 M246 374 L260 396 L272 372", 1.4, RED) +
           stroke("M138 132 C150 150 132 170 146 188 C160 206 140 220 152 236", 1.2, RED, .9) +
           stroke("M262 132 C250 150 268 170 254 188 C240 206 260 220 248 236", 1.2, RED, .9))
    art = (body(JEANS, "#1A1A1A", .34, "c1") + f'<g clip-path="url(#c1)">{red}</g>' +
           seams(JEANS_SEAMS) + stitch(JEANS_STITCH) + LOOPS + outline(JEANS))
    items["jeans-restart"] = (art, crop_at(150, 168))

    # 02 · Костюм ОБЪЕЗД — беж, вставки лес и олива
    art = (body(JACKET, "#CDBF9F", .45, "c2") +
           f'<g clip-path="url(#c2)"><path d="{PANEL_SIDE}" fill="#24492F" fill-opacity=".5"/>'
           f'<path d="{PANEL_LOW}" fill="#6F6A35" fill-opacity=".45"/></g>' +
           seams(JACKET_SEAMS + " " + PANEL_SIDE + " " + PANEL_LOW) +
           f'<path d="{COLLAR}" fill="#CDBF9F" fill-opacity=".45"/>' + outline(COLLAR) +
           stroke("M200 62 L200 404", 1.1) + stitch("M194 98 L194 400 M206 98 L206 400") + outline(JACKET))
    items["suit-detour"] = (art, crop_at(200, 120))

    # 03 · Джинсы КАРАКУЛИ — серый варёный, красная вышивка
    loops = "".join(stroke(smooth_loop(rng, x, y, r), 1.1, RED, .85) for x, y, r in
                    ((150, 140, 16), (246, 128, 14), (140, 250, 18), (258, 236, 15), (146, 352, 16), (252, 340, 18), (196, 120, 10)))
    art = (body(JEANS, "#8C8C88", .2, "c3") + f'<g clip-path="url(#c3)">{loops}</g>' +
           seams(JEANS_SEAMS) + stitch(JEANS_STITCH) + LOOPS + outline(JEANS))
    items["jeans-scribble"] = (art, crop_at(150, 200))

    # 04 · Худи ТРЕЩИНА — вид со спины, трещины принтом
    cr = "".join(stroke(crack(rng, x, y), 1, INK, .55) for x, y in
                 ((150, 170), (230, 160), (190, 230), (140, 300), (250, 290), (200, 350), (160, 390)))
    art = (body(HOODIE, "#3A3A3A", .24, "c4") + f'<path d="{HOOD} Z" fill="#3A3A3A" fill-opacity=".24"/>' +
           f'<g clip-path="url(#c4)">{cr}</g>' + outline(HOOD) + stroke("M200 36 L200 122", 1, o=.4) +
           seams(HOODIE_SEAMS) + stitch("M120 412 L280 412") + outline(HOODIE))
    items["hoodie-crack"] = (art, crop_at(190, 240))

    # 05 · Косуха КАПЮШОН — графит варёный, косая молния, пояс
    snaps = "".join(f'<circle cx="{x}" cy="{y}" r="2.6" fill="none" stroke="{INK}" stroke-width="1" vector-effect="non-scaling-stroke"/>'
                    for x, y in ((174, 140), (222, 158), (256, 162)))
    belt = outline("M122 388 L278 388 L278 404 L122 404 Z") + outline("M236 384 L258 384 L258 408 L236 408 Z")
    art = (body(BIKER, "#3E403F", .28, "c5") + f'<path d="{BIKER_HOOD} Z" fill="#3E403F" fill-opacity=".28"/>' +
           outline(BIKER_HOOD) + seams(BIKER_SEAMS) + stroke(BIKER_ZIP, 1.2) + stitch("M226 116 C208 202 164 302 152 400") +
           snaps + belt + outline(BIKER))
    items["jacket-biker"] = (art, crop_at(210, 160))

    # 06 · Джинсы КРАСНАЯ ЛИНИЯ — индиго, красная строчка по всем швам
    reds = stitch(JEANS_STITCH + " M152 206 C146 300 140 384 134 446 M248 206 C254 300 260 384 266 446 "
                  "M114 300 C134 290 160 292 184 306 M286 300 C266 290 240 292 216 306", RED, .9)
    art = (body(JEANS, "#1D2A44", .34, "c6") + seams(JEANS_SEAMS) + reds + LOOPS + outline(JEANS))
    items["jeans-redline"] = (art, crop_at(160, 300))

    # 07 · Футболка ФОН — белая база, G у подола
    art = (f'<path d="{TEE}" fill="#FFFFFF"/>' + seams(TEE_SEAMS) + stitch(TEE_STITCH) + jacquard(124, 388) + outline(TEE))
    items["tee-blank"] = (art, crop_at(150, 370))

    # 08 · Лонгслив ФОН — белый, длинная манжета в рубчик
    rib = stitch("M68 360 L102 366 M67 370 L101 376 M298 366 L332 360 M299 376 L333 370", INK, .3)
    art = (f'<path d="{LONG}" fill="#FFFFFF"/>' + seams(LONG_SEAMS) + stitch(LONG_STITCH) + rib + jacquard(126, 388) + outline(LONG))
    items["longsleeve-blank"] = (art, crop_at(110, 370))
    return items

if __name__ == "__main__":
    total = 0
    for pid, (art, crop) in build().items():
        for n, s in ((1, svg(art)), (2, svg(art, crop))):
            p = OUT / f"{pid}-{n}.svg"
            p.write_text(s, encoding="utf-8")
            total += len(s.encode())
    print(f"img: {total/1024:.0f} КБ")
