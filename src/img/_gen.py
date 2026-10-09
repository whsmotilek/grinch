#!/usr/bin/env python3
"""Эскизы вещей дропа 01 (K1). Пишет src/img/<id>-1.svg (основной вид) и -2.svg (второй вид для hover и шита).

Правила (FIXES v2, verify/04_art №12, №24; verify/01_desktop №8):
- «стол»: у всех вещей подол на одной линии пола — 84 % высоты плитки; масштаб общий внутри категории
  (низ: джинсы и брюки; верх: худи, косуха, костюм, футболка, лонгслив); под вещью мягкая контактная тень;
- заливка — настоящим цветом из [ЦВЕТ]: чёрный, графит, индиго, беж/лес/олива, белый; на тёмной вещи швы светлые;
- контур 1,5 px, швы 1 px, строчка пунктиром — толщина постоянная при любом масштабе (non-scaling-stroke);
- второй вид — в той же крупности (спина / брюки костюма / лицо худи), а у футболки и лонгслива — деталь,
  обрезанная по шву: G у подола крупно и манжета в рубчик. Никаких надписей, лент, рамок.
Фон прозрачный — бумагу даёт карточка. Запуск: python3 src/img/_gen.py (детерминирован)."""
from __future__ import annotations
import math, random, pathlib

OUT = pathlib.Path(__file__).parent
INK = "#141414"
LIGHT = "#F2F1EE"
RED = "#CF3328"
W, H = 400, 500
FLOOR = 420                      # 84 % высоты плитки
SCALE = {"bottom": .9, "top": .88}

def st(d: str, w: float = 1, c: str = INK, o: float = 1, dash: str = "", cap: str = "round") -> str:
    da = f' stroke-dasharray="{dash}"' if dash else ""
    op = f' stroke-opacity="{o}"' if o != 1 else ""
    return (f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="{cap}" '
            f'stroke-linejoin="round" vector-effect="non-scaling-stroke"{da}{op}/>')

def fill(d: str, c: str, o: float = 1) -> str:
    return f'<path d="{d}" fill="{c}"' + (f' fill-opacity="{o}"' if o != 1 else "") + "/>"

def outline(d: str) -> str:
    return st(d, 1.5)

class Look:
    """Палитра вещи: заливка + цвет швов, читаемый на ней."""
    def __init__(self, base: str, seam: str, seam_o: float):
        self.base, self.seam, self.seam_o = base, seam, seam_o
    def seams(self, d: str) -> str:
        return st(d, 1, self.seam, self.seam_o)
    def stitch(self, d: str, c: str | None = None, o: float | None = None) -> str:
        return st(d, 1, c or self.seam, o if o is not None else self.seam_o + .08, dash="3 3", cap="butt")

# ---------- силуэты, координаты 400×500 (до посадки на пол) ----------
JEANS = ("M128 62 L272 62 L276 86 C290 206 306 330 318 448 L214 454 L200 196 L186 454 "
         "L82 448 C94 330 110 206 124 86 Z")
JEANS_HEM = 454
JEANS_FRONT = ("M124 86 L276 86 M200 86 L200 190 "
               "M130 94 C146 120 166 124 176 88 M270 94 C254 120 234 124 224 88 "
               "M152 206 C146 300 140 384 134 446 M248 206 C254 300 260 384 266 446")
JEANS_FRONT_ST = ("M126 74 L274 74 M210 88 L210 156 C210 168 205 176 200 180 "
                  "M88 432 L189 438 M211 438 L312 432 M240 96 L258 96 L257 112 L241 112 Z")
JEANS_BACK = ("M124 86 L276 86 M200 86 L200 196 M126 118 L200 132 L274 118 "
              "M138 140 L184 146 L182 196 L162 206 L140 194 Z M262 140 L216 146 L218 196 L238 206 L260 194 Z "
              "M152 206 C146 300 140 384 134 446 M248 206 C254 300 260 384 266 446")
JEANS_BACK_ST = ("M126 74 L274 74 M128 126 L200 140 L272 126 M144 150 L178 154 M256 150 L222 154 "
                 "M88 432 L189 438 M211 438 L312 432")
LOOPS = "M142 62 L142 86 M170 62 L170 86 M200 62 L200 86 M230 62 L230 86 M258 62 L258 86"

PANTS = ("M130 70 L270 70 L274 96 C290 210 304 330 312 430 L304 452 L212 456 L200 196 L188 456 "
         "L96 452 L88 430 C96 330 110 210 126 96 Z")
PANTS_HEM = 456
PANTS_SEAMS = "M126 96 L274 96 M200 96 L200 190 M184 96 L178 140 M216 96 L222 140 M88 430 L190 438 M210 438 L312 430"
PANTS_WAIST = "M130 82 C150 86 170 78 190 84 C210 90 230 78 250 84 C260 86 268 82 270 82"
PANTS_PANEL = ("M110 210 C130 260 140 330 136 452 L96 452 L88 430 C94 330 102 260 110 210 Z "
               "M290 210 C270 260 260 330 264 452 L304 452 L312 430 C306 330 298 260 290 210 Z")
PANTS_KNEE = "M128 236 C150 226 176 232 190 246 L190 330 C170 320 146 318 126 326 Z M272 236 C250 226 224 232 210 246 L210 330 C230 320 254 318 274 326 Z"

JACKET = ("M164 92 L108 108 C88 162 76 262 70 362 L104 368 L118 232 L120 404 L280 404 L282 232 "
          "L296 368 L330 362 C324 262 312 162 292 108 L236 92 Z")
JACKET_HEM = 404
COLLAR = "M164 62 L236 62 L240 96 L160 96 Z"
JACKET_SEAMS = ("M118 232 C116 200 112 160 108 110 M282 232 C284 200 288 160 292 110 "
                "M120 386 L280 386 M70 344 L104 350 M296 350 L330 344")
PANEL_SIDE = "M108 108 C140 150 150 200 146 270 L118 280 L118 232 Z M292 108 C260 150 250 200 254 270 L282 280 L282 232 Z"
PANEL_LOW = "M120 404 L120 300 C150 262 178 252 200 256 C222 252 250 262 280 300 L280 404 Z"

# худи: спина (капюшон куполом, трещины) и лицо (капюшон вокруг выреза, карман-кенгуру, манжеты)
HOODIE = ("M142 106 L96 124 C80 200 72 300 66 394 L102 400 L116 252 L118 424 L282 424 L284 252 "
          "L298 400 L334 394 C328 300 320 200 304 124 L258 106 C246 118 224 124 200 124 C176 124 154 118 142 106 Z")
HOODIE_HEM = 424
HOOD_BACK = "M142 118 C130 70 160 36 200 36 C240 36 270 70 258 118 C240 128 220 132 200 132 C180 132 160 128 142 118 Z"
HOOD_FRONT = "M142 110 C134 66 162 40 200 40 C238 40 266 66 258 110 C246 122 226 128 200 128 C174 128 154 122 142 110 Z"
HOOD_OPEN = "M170 112 C166 80 182 62 200 62 C218 62 234 80 230 112 C220 120 210 122 200 122 C190 122 180 120 170 112 Z"
HOODIE_SEAMS = ("M116 252 C114 210 108 170 98 128 M284 252 C286 210 292 170 302 128 "
                "M66 372 L102 378 M298 378 L334 372 M118 402 L282 402")
HOODIE_RIB = ("M68 380 L101 385 M67 387 L101 392 M299 385 L332 380 M299 392 L333 387 "
              "M118 410 L282 410 M118 417 L282 417")
POCKET = "M146 300 L254 300 L270 372 L130 372 Z"
POCKET_ST = "M152 306 L248 306 M146 300 L134 366 M254 300 L266 366"

BIKER = ("M156 90 L104 108 C86 170 78 270 72 380 L108 386 L120 242 L122 406 L278 406 L280 242 "
         "L292 386 L328 380 C322 270 314 170 296 108 L244 90 Z")
BIKER_HEM = 406
BIKER_HOOD = "M150 94 C140 52 170 30 200 30 C230 30 260 52 250 94 C234 102 216 104 200 104 C184 104 166 102 150 94 Z"
BIKER_FRONT = ("M160 92 L180 162 L216 178 M244 92 L230 150 L262 168 "
               "M120 242 C118 200 112 160 104 112 M280 242 C282 200 288 160 296 112 "
               "M72 358 L108 364 M292 364 L328 358")
BIKER_BACK = ("M120 242 C118 200 112 160 104 112 M280 242 C282 200 288 160 296 112 "
              "M118 160 C150 172 250 172 282 160 M200 104 L200 160 "
              "M72 358 L108 364 M292 364 L328 358")
BIKER_ZIP = "M232 110 C214 200 170 300 158 404"
BELT = "M122 384 L278 384 L278 402 L122 402 Z"
BUCKLE = "M236 380 L258 380 L258 406 L236 406 Z"

TEE = ("M150 66 C170 82 230 82 250 66 L316 92 L340 168 L300 182 L290 148 L290 420 L110 420 "
       "L110 148 L100 182 L60 168 L84 92 Z")
TEE_HEM = 420
TEE_SEAMS = "M150 66 C170 94 230 94 250 66 M110 148 L84 92 M290 148 L316 92"
TEE_ST = "M112 406 L288 406 M154 70 C172 88 228 88 246 70 M298 176 L304 164 M102 176 L96 164"

LONG = ("M150 66 C170 82 230 82 250 66 L300 90 C318 180 330 300 336 404 L302 410 L288 170 L288 420 "
        "L112 420 L112 170 L98 410 L64 404 C70 300 82 180 100 90 Z")
LONG_HEM = 420
LONG_SEAMS = ("M150 66 C170 94 230 94 250 66 "
              "M112 170 C110 148 106 118 100 92 M288 170 C290 148 294 118 300 92 M66 370 L101 376 M299 376 L334 370")
LONG_ST = "M114 406 L286 406 M154 70 C172 88 228 88 246 70"
LONG_RIB = "".join(f"M{66 + i * 4.2:.1f} {372 + i * .7:.1f} L{64 + i * 4.2:.1f} {406 + i * .7:.1f} " for i in range(9)) + \
           "".join(f"M{300 + i * 4.2:.1f} {377 - i * .7:.1f} L{302 + i * 4.2:.1f} {411 - i * .7:.1f} " for i in range(9))

G_PATH = ("M253 146c0 14-3 28-8 41 -5 13-12 25-20 35 -10 12-22 21-36 28 -15 6-32 10-52 10 -18 0-35-3-52-9 -16-5-30-14-43-25 "
          "-12-11-22-25-29-41 -7-17-11-35-11-54 0-19 4-37 11-54 7-16 17-30 30-41 13-11 28-20 45-25 18-6 37-9 56-9 26 0 49 4 69 13 "
          "18 7 34 19 47 34 12 14 19 31 22 50l-56 0c-2-10-7-19-15-26 -8-8-17-14-28-17 -12-4-26-6-39-6 -17 0-32 3-45 9 -12 6-23 16-29 28 "
          "-7 12-11 27-11 44 0 17 4 32 11 45 7 12 16 21 29 28 14 6 28 10 46 10 18 0 30-3 43-9 13-6 22-15 29-26 8-11 9-20 12-33zm-99 24l0-40 128 0 0 125 -40 0 0-85z")

def jacquard(x: float, y: float, s: float = 13) -> str:
    """Жаккардовая бирка G у подола — знак, не надпись."""
    k = s * .62 / 284
    gx, gy = x + (s - 284 * k) / 2, y + (s - 262 * k) / 2
    return (f'<rect x="{x}" y="{y}" width="{s}" height="{s}" fill="{INK}"/>'
            f'<path d="{G_PATH}" fill="#00DB24" transform="translate({gx:.2f} {gy:.2f}) scale({k:.4f})"/>')

def loop(rng: random.Random, cx: float, cy: float, r: float) -> str:
    pts = []
    for i in range(7):
        a = i / 7 * math.tau + rng.uniform(-.3, .3)
        rr = r * rng.uniform(.6, 1.25)
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr * 1.5))
    d = f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"
    for i in range(1, 8):
        p0, p1 = pts[(i - 1) % 7], pts[i % 7]
        d += f" Q{p0[0]:.1f} {p0[1]:.1f} {(p0[0] + p1[0]) / 2:.1f} {(p0[1] + p1[1]) / 2:.1f}"
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

class Art:
    """Вещь, посаженная на пол: transform переводит её собственный подол hem в FLOOR с масштабом категории."""
    def __init__(self, body: str, hem: float, cat: str, half_w: float):
        self.body, self.hem, self.s, self.half_w = body, hem, SCALE[cat], half_w
    def pt(self, x: float, y: float) -> tuple[float, float]:
        return 200 + (x - 200) * self.s, FLOOR + (y - self.hem) * self.s
    def svg(self, crop: tuple[float, float, float] | None = None) -> str:
        """crop = (cx, cy, zoom) в координатах рисунка до посадки."""
        g = f'<g transform="translate(200 {FLOOR}) scale({self.s}) translate(-200 {-self.hem})">{self.body}</g>'
        rx = self.half_w * self.s
        shadow = (f'<ellipse cx="200" cy="{FLOOR + 3}" rx="{rx:.0f}" ry="7" fill="url(#sh)"/>')
        defs = ('<defs><radialGradient id="sh"><stop offset="0" stop-color="#000" stop-opacity=".16"/>'
                '<stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>')
        if crop is None:
            vb = "0 0 400 500"
        else:
            cx, cy = self.pt(crop[0], crop[1])
            w, h = W / crop[2], H / crop[2]
            vb = f"{cx - w / 2:.1f} {cy - h / 2:.1f} {w:.1f} {h:.1f}"
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="800" height="1000" '
                f'preserveAspectRatio="xMidYMid slice">{defs}{shadow}{g}</svg>')

def build() -> dict[str, tuple[Art, Art | tuple[float, float, float]]]:
    rng = random.Random(11)
    out: dict[str, tuple[Art, Art | tuple[float, float, float]]] = {}

    # 01 · Джинсы RESTART [ЧЁРНЫЙ / КРАСНЫЙ] — перед с принтом, спина
    k = Look("#222222", LIGHT, .3)
    red = (st("M150 210 C146 270 142 330 140 392 M128 372 L140 396 L154 374", 1.5, RED) +
           st("M250 210 C254 270 258 330 260 392 M246 374 L260 396 L272 372", 1.5, RED) +
           st("M138 132 C150 150 132 170 146 188 C160 206 140 220 152 236", 1.2, RED) +
           st("M262 132 C250 150 268 170 254 188 C240 206 260 220 248 236", 1.2, RED))
    front = (f'<clipPath id="c"><path d="{JEANS}"/></clipPath>' + fill(JEANS, k.base) + f'<g clip-path="url(#c)">{red}</g>' +
             k.seams(JEANS_FRONT) + k.stitch(JEANS_FRONT_ST) + k.seams(LOOPS) + outline(JEANS))
    back = (fill(JEANS, k.base) + k.seams(JEANS_BACK) + k.stitch(JEANS_BACK_ST) + k.seams(LOOPS) +
            st("M160 160 C168 170 156 180 166 190", 1.2, RED) + outline(JEANS))
    out["jeans-restart"] = (Art(front, JEANS_HEM, "bottom", 120), Art(back, JEANS_HEM, "bottom", 120))

    # 02 · Костюм ОБЪЕЗД [БЕЖ / ЛЕС / ОЛИВА] — ветровка и брюки комплекта
    BEIGE, FOREST, OLIVE = "#D8CBA9", "#2E4C35", "#7B7541"
    s = Look(BEIGE, INK, .3)
    jacket = (f'<clipPath id="c"><path d="{JACKET}"/></clipPath>' + fill(JACKET, BEIGE) +
              f'<g clip-path="url(#c)">{fill(PANEL_SIDE, FOREST)}{fill(PANEL_LOW, OLIVE)}</g>' +
              s.seams(JACKET_SEAMS) + st(PANEL_SIDE + " " + PANEL_LOW, 1, INK, .45) +
              fill(COLLAR, BEIGE) + outline(COLLAR) + st("M200 62 L200 404", 1.2) +
              s.stitch("M194 98 L194 400 M206 98 L206 400") + outline(JACKET))
    pants = (f'<clipPath id="c"><path d="{PANTS}"/></clipPath>' + fill(PANTS, BEIGE) +
             f'<g clip-path="url(#c)">{fill(PANTS_PANEL, FOREST)}{fill(PANTS_KNEE, OLIVE)}</g>' +
             s.seams(PANTS_SEAMS) + st(PANTS_PANEL + " " + PANTS_KNEE, 1, INK, .45) + s.stitch(PANTS_WAIST) + outline(PANTS))
    out["suit-detour"] = (Art(jacket, JACKET_HEM, "top", 130), Art(pants, PANTS_HEM, "bottom", 112))

    # 03 · Джинсы КАРАКУЛИ [СЕРЫЙ ВАРЁНЫЙ] — вышивка спереди и сзади
    g = Look("#A3A39F", INK, .3)
    loops_f = "".join(st(loop(rng, x, y, r), 1.2, RED) for x, y, r in
                      ((150, 140, 16), (246, 128, 14), (140, 250, 18), (258, 236, 15), (146, 352, 16), (252, 340, 18), (196, 120, 10)))
    loops_b = "".join(st(loop(rng, x, y, r), 1.2, RED) for x, y, r in
                      ((160, 230, 15), (244, 250, 17), (146, 330, 16), (256, 360, 14), (150, 410, 12)))
    front = (f'<clipPath id="c"><path d="{JEANS}"/></clipPath>' + fill(JEANS, g.base) + f'<g clip-path="url(#c)">{loops_f}</g>' +
             g.seams(JEANS_FRONT) + g.stitch(JEANS_FRONT_ST) + g.seams(LOOPS) + outline(JEANS))
    back = (f'<clipPath id="c"><path d="{JEANS}"/></clipPath>' + fill(JEANS, g.base) + f'<g clip-path="url(#c)">{loops_b}</g>' +
            g.seams(JEANS_BACK) + g.stitch(JEANS_BACK_ST) + g.seams(LOOPS) + outline(JEANS))
    out["jeans-scribble"] = (Art(front, JEANS_HEM, "bottom", 120), Art(back, JEANS_HEM, "bottom", 120))

    # 04 · Худи ТРЕЩИНА [ГРАФИТ] — спина с принтом (главный кадр), лицо с карманом
    h = Look("#4E4F51", LIGHT, .28)
    cr = "".join(st(crack(rng, x, y), 1.1, "#0E0E0E", .85) for x, y in
                 ((150, 170), (232, 160), (192, 236), (140, 300), (252, 292), (200, 352), (160, 392)))
    back = (fill(HOOD_BACK, h.base) + h.seams("M200 38 L200 130") + outline(HOOD_BACK) +
            f'<clipPath id="c"><path d="{HOODIE}"/></clipPath>' + fill(HOODIE, h.base) + f'<g clip-path="url(#c)">{cr}</g>' +
            h.seams(HOODIE_SEAMS) + h.stitch(HOODIE_RIB) + outline(HOODIE))
    front = (fill(HOOD_FRONT, h.base) + outline(HOOD_FRONT) + fill(HOOD_OPEN, "#1E1F20") + outline(HOOD_OPEN) +
             fill(HOODIE, h.base) + h.seams(HOODIE_SEAMS) + h.stitch(HOODIE_RIB) +
             outline(POCKET) + h.stitch(POCKET_ST) + outline(HOODIE))
    out["hoodie-crack"] = (Art(back, HOODIE_HEM, "top", 135), Art(front, HOODIE_HEM, "top", 135))

    # 05 · Косуха КАПЮШОН [ГРАФИТ ВАРЁНЫЙ] — перед с косой молнией, спина с кокеткой
    j = Look("#555759", LIGHT, .28)
    metal = "#D9D9D6"
    snaps = "".join(f'<circle cx="{x}" cy="{y}" r="2.6" fill="{metal}"/>' for x, y in ((174, 140), (222, 158), (256, 162)))
    front = (fill(BIKER_HOOD, j.base) + outline(BIKER_HOOD) + fill(BIKER, j.base) + j.seams(BIKER_FRONT) +
             st(BIKER_ZIP, 1.6, metal) + j.stitch("M226 116 C208 202 164 302 152 400") + snaps +
             fill(BELT, "#3E4042") + outline(BELT) + st(BUCKLE, 1.6, metal) + outline(BIKER))
    back = (fill(BIKER_HOOD, j.base) + j.seams("M200 32 L200 102") + outline(BIKER_HOOD) + fill(BIKER, j.base) +
            j.seams(BIKER_BACK) + j.stitch("M120 168 C150 180 250 180 280 168") +
            fill(BELT, "#3E4042") + outline(BELT) + outline(BIKER))
    out["jacket-biker"] = (Art(front, BIKER_HEM, "top", 135), Art(back, BIKER_HEM, "top", 135))

    # 06 · Джинсы КРАСНАЯ ЛИНИЯ [ИНДИГО] — красная строчка по всем швам, спереди и сзади
    i = Look("#263453", LIGHT, .26)
    knee = "M114 300 C134 290 160 292 184 306 M286 300 C266 290 240 292 216 306"
    sides = "M152 206 C146 300 140 384 134 446 M248 206 C254 300 260 384 266 446"
    front = (fill(JEANS, i.base) + i.seams(JEANS_FRONT) + i.stitch(JEANS_FRONT_ST + " " + sides + " " + knee, RED, .95) +
             i.seams(LOOPS) + outline(JEANS))
    back = (fill(JEANS, i.base) + i.seams(JEANS_BACK) + i.stitch(JEANS_BACK_ST + " " + sides + " " + knee, RED, .95) +
            i.seams(LOOPS) + outline(JEANS))
    out["jeans-redline"] = (Art(front, JEANS_HEM, "bottom", 120), Art(back, JEANS_HEM, "bottom", 120))

    # 07 · Футболка ФОН [БЕЛЫЙ] — целиком; деталь: G у подола крупно, по шву
    w = Look("#FFFFFF", INK, .3)
    tee = fill(TEE, "#FFFFFF") + w.seams(TEE_SEAMS) + w.stitch(TEE_ST) + jacquard(124, 390) + outline(TEE)
    out["tee-blank"] = (Art(tee, TEE_HEM, "top", 110), (138, 392, 3.2))

    # 08 · Лонгслив ФОН [БЕЛЫЙ] — целиком; деталь: манжета в рубчик
    long_ = (fill(LONG, "#FFFFFF") + w.seams(LONG_SEAMS) + w.stitch(LONG_ST) + st(LONG_RIB, 1, INK, .3) +
             jacquard(126, 390) + outline(LONG))
    out["longsleeve-blank"] = (Art(long_, LONG_HEM, "top", 128), (96, 386, 3.0))
    return out

if __name__ == "__main__":
    total = 0
    for pid, (a, b) in build().items():
        s2 = b.svg() if isinstance(b, Art) else a.svg(b)
        for n, s in ((1, a.svg()), (2, s2)):
            (OUT / f"{pid}-{n}.svg").write_text(s, encoding="utf-8")
            total += len(s.encode())
    print(f"img: {total/1024:.0f} КБ")
