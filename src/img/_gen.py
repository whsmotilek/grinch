#!/usr/bin/env python3
"""Генератор плейсхолдеров товаров (агент A). Пишет src/img/<id>-1.svg (вещь целиком) и -2.svg (деталь ×2).
Линейный силуэт на paper + лента «ФОТО СКОРО». Красный — только у вещей, где он есть в самой вещи.
Запуск: python3 src/img/_gen.py  (детерминирован, seed фиксирован)."""
from __future__ import annotations
import math, random, pathlib

OUT = pathlib.Path(__file__).parent
PAPER, INK, RED, GREEN = "#F4F3F3", "#111111", "#FF4D4D", "#00DB24"
MONO = "Menlo,'SF Mono',ui-monospace,monospace"
HEAVY = "'Arial Black','Helvetica Neue',Arial,sans-serif"

def r1(v: float) -> str:
    return f"{v:.0f}"

# ---------- силуэты (viewBox 400×500) ----------
JEANS = ("M128 70 L272 70 L276 92 C290 210 306 330 318 446 L214 452 L200 196 L186 452 "
         "L82 446 C94 330 110 210 124 92 Z")
JEANS_IN = ("M124 92 L276 92 M140 70 L140 96 M170 70 L170 96 M230 70 L230 96 M260 70 L260 96 "
            "M200 92 L200 190 M210 92 L210 160 C210 172 205 180 200 184 "
            "M130 100 C146 124 166 128 176 94 M270 100 C254 124 234 128 224 94 "
            "M240 101 L258 101 L257 117 L241 117 Z "
            "M88 430 L189 437 M211 437 L312 430 M152 210 C146 300 140 380 134 444 M248 210 C254 300 260 380 266 444")
PANTS = ("M130 70 L270 70 L274 96 C290 210 304 330 312 430 L304 452 L212 456 L200 196 L188 456 "
         "L96 452 L88 430 C96 330 110 210 126 96 Z")
PANTS_IN = ("M126 96 L274 96 M130 84 C150 88 170 80 190 86 C210 92 230 80 250 86 C260 88 268 84 270 84 "
            "M200 96 L200 190 M184 96 L178 140 M216 96 L222 140 "
            "M88 430 L190 438 M210 438 L312 430 M196 70 L192 110 M204 70 L208 110")
JACKET = ("M164 94 L108 110 C88 162 76 262 70 362 L104 368 L118 232 L120 404 L280 404 L282 232 "
          "L296 368 L330 362 C324 262 312 162 292 110 L236 94 Z")
JACKET_COLLAR = "M166 66 L234 66 L238 98 L162 98 Z"
JACKET_IN = ("M200 66 L200 404 M120 386 L280 386 M70 344 L104 350 M296 350 L330 344 "
             "M118 232 C116 200 112 160 108 112 M282 232 C284 200 288 160 292 112 M162 98 L238 98")
HOOD = "M142 122 C128 70 160 38 200 38 C240 38 272 70 258 122 Z"
HOODIE = ("M142 108 L96 126 C80 200 72 300 66 394 L102 400 L116 252 L118 424 L282 424 L284 252 "
          "L298 400 L334 394 C328 300 320 200 304 126 L258 108 Z")
HOODIE_IN = ("M200 40 L200 120 M118 404 L282 404 M66 378 L102 384 M298 384 L334 378 "
             "M116 252 C114 210 108 170 98 130 M284 252 C286 210 292 170 302 130")
BIKER_HOOD = "M150 96 C142 54 170 34 200 34 C230 34 258 54 250 96 Z"
BIKER = ("M156 92 L104 110 C86 170 78 270 72 380 L108 386 L120 242 L122 406 L278 406 L280 242 "
         "L292 386 L328 380 C322 270 314 170 296 110 L244 92 Z")
BIKER_IN = ("M160 94 L178 162 L214 178 M244 94 L230 150 L262 168 "
            "M120 242 C118 200 112 160 104 114 M280 242 C282 200 288 160 296 114 "
            "M72 360 L108 366 M292 366 L328 360")
BIKER_ZIP = "M232 112 C214 200 168 300 156 404"
TEE = ("M150 70 C170 86 230 86 250 70 L316 96 L340 170 L300 184 L290 150 L290 420 L110 420 "
       "L110 150 L100 184 L60 170 L84 96 Z")
TEE_IN = "M150 70 C170 98 230 98 250 70 M110 406 L290 406 M300 184 L306 172 M100 184 L94 172"
LONG = ("M150 70 C170 86 230 86 250 70 L300 92 C318 180 330 300 336 404 L302 410 L288 172 L288 420 "
        "L112 420 L112 172 L98 410 L64 404 C70 300 82 180 100 92 Z")
LONG_IN = ("M150 70 C170 98 230 98 250 70 M112 406 L288 406 M66 384 L100 390 M300 390 L334 384 "
           "M112 172 C110 150 106 120 100 94 M288 172 C290 150 294 120 300 94")

def wash(rng: random.Random, clip: str, base: str, tones: list[str], n: int = 9) -> str:
    """Варёная фактура: размытые пятна внутри силуэта."""
    blobs = "".join(
        f'<ellipse cx="{r1(rng.uniform(70,330))}" cy="{r1(rng.uniform(60,440))}" rx="{r1(rng.uniform(26,70))}" '
        f'ry="{r1(rng.uniform(20,60))}" fill="{rng.choice(tones)}" opacity="{rng.uniform(.25,.55):.2f}"/>'
        for _ in range(n))
    return f'<g clip-path="url(#{clip})" filter="url(#soft)">{blobs}</g>'

def scribbles(rng: random.Random, n: int, color: str, area=(90, 90, 310, 440)) -> str:
    """Каракули-вышивка: гладкие петли."""
    out = []
    for _ in range(n):
        x, y = rng.uniform(area[0], area[2]), rng.uniform(area[1], area[3])
        d = f"M{r1(x)} {r1(y)}"
        for _ in range(rng.randint(3, 6)):
            c1 = (x + rng.uniform(-40, 40), y + rng.uniform(-40, 40))
            c2 = (x + rng.uniform(-40, 40), y + rng.uniform(-40, 40))
            x, y = x + rng.uniform(-30, 30), y + rng.uniform(-30, 30)
            d += f" C{r1(c1[0])} {r1(c1[1])} {r1(c2[0])} {r1(c2[1])} {r1(x)} {r1(y)}"
        out.append(d)
    return f'<path d="{" ".join(out)}" fill="none" stroke="{color}" stroke-width="1" vector-effect="non-scaling-stroke" opacity=".9"/>'

def cracks(rng: random.Random, n: int, color: str) -> str:
    """Трещины-принт: ломаные с ответвлениями."""
    out = []
    for _ in range(n):
        x, y = rng.uniform(80, 320), rng.uniform(70, 400)
        ang = rng.uniform(-math.pi, math.pi)
        d = f"M{r1(x)} {r1(y)}"
        for _ in range(rng.randint(4, 8)):
            ang += rng.uniform(-.7, .7)
            ln = rng.uniform(8, 20)
            x, y = x + math.cos(ang) * ln, y + math.sin(ang) * ln
            d += f" L{r1(x)} {r1(y)}"
        out.append(d)
    return f'<path d="{" ".join(out)}" fill="none" stroke="{color}" stroke-width="1.6" stroke-linejoin="bevel" vector-effect="non-scaling-stroke"/>'

def garment(outline: str, inner: str, fill: str, line: str = INK, inner_c: str = INK, extra: str = "",
            clip: str = "cl", pre: str = "", post: str = "") -> str:
    return (f'<clipPath id="{clip}"><path d="{outline}"/></clipPath>{pre}'
            f'<path d="{outline}" fill="{fill}"/>{extra}'
            f'<path d="{inner}" fill="none" stroke="{inner_c}" stroke-width="1.1" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity=".75"/>'
            f'<path d="{outline}" fill="none" stroke="{line}" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>{post}')

def tape(y: float = 446, rot: float = -11) -> str:
    words = "  ФОТО СКОРО  ·" * 6
    return (f'<g transform="rotate({rot} 200 {y})"><rect x="-80" y="{y-17}" width="560" height="34" fill="{GREEN}"/>'
            f'<rect x="-80" y="{y-17}" width="560" height="34" fill="url(#tapeShade)"/>'
            f'<text x="-40" y="{y+6}" font-family="{HEAVY}" font-weight="900" font-size="15" letter-spacing=".5" fill="#000">{words}</text></g>')

def frame(sku: str, label: str, body: str, alt: bool) -> str:
    marks = ('<path d="M16 34 L16 16 L34 16 M366 16 L384 16 L384 34 M16 466 L16 484 L34 484 M366 484 L384 484 L384 466" '
             'fill="none" stroke="#111" stroke-width="1" opacity=".5"/>')
    head = (f'<text x="26" y="36" font-family="{MONO}" font-size="9.5" fill="#111" opacity=".7">drop: 01</text>'
            f'<text x="374" y="36" text-anchor="end" font-family="{MONO}" font-size="9.5" fill="#111" opacity=".7">{sku}{" · деталь" if alt else ""}</text>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="800" height="1000">'
            '<defs><filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>'
            '<linearGradient id="tapeShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/>'
            '<stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient></defs>'
            f'<rect width="400" height="500" fill="{PAPER}"/>{marks}{head}{body}{tape()}</svg>')

def zoom(art: str, vb: tuple[int, int, int, int], notes: list[tuple[float, float, float, float, str]]) -> str:
    """Деталь: тот же рисунок, кадр ×2 + выноски. notes: (x, y в координатах рисунка, сторона подписи 0=лево/1=право, y подписи, текст)."""
    x, y, w, h = vb
    s = max(360 / w, 380 / h)
    inner = f'<svg x="20" y="48" width="360" height="380" viewBox="{x} {y} {w} {h}" preserveAspectRatio="xMidYMid slice">{art}</svg>'
    inner += '<rect x="20" y="48" width="360" height="380" fill="none" stroke="#111" stroke-width="1"/>'
    for px, py, side, ty, t in notes:
        cx, cy = 200 + (px - (x + w / 2)) * s, 238 + (py - (y + h / 2)) * s
        bw = len(t) * 6.4 + 14
        bx = 372 - bw if side else 28
        lx = bx if side else bx + bw
        inner += (f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="18" fill="none" stroke="#000" stroke-width="1.4"/>'
                  f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="2.5" fill="#000"/>'
                  f'<path d="M{cx:.0f} {cy:.0f} L{lx:.0f} {ty}" stroke="#000" stroke-width="1"/>'
                  f'<rect x="{bx:.0f}" y="{ty - 11}" width="{bw:.0f}" height="20" fill="#000"/>'
                  f'<text x="{bx + 7:.0f}" y="{ty + 3}" font-family="{MONO}" font-size="10" fill="{PAPER}">{t}</text>')
    return inner

def jacquard(x: float, y: float, s: float = 18) -> str:
    """Жаккардовая бирка с G (pres_15) — зелёный акцент бренда."""
    return (f'<rect x="{x}" y="{y}" width="{s}" height="{s}" fill="#000"/>'
            f'<text x="{x + s/2}" y="{y + s*0.74}" text-anchor="middle" font-family="{HEAVY}" font-weight="900" font-size="{s*0.62:.1f}" fill="{GREEN}">G</text>')

def build() -> dict[str, tuple[str, str]]:
    rng = random.Random(7)
    items: dict[str, tuple[str, str]] = {}

    # 1. Чёрные джинсы RESTART — красный принт от руки
    restart = "".join(f'<text x="{x}" y="{132 + i * 21}" font-family="{HEAVY}" font-size="15" font-weight="900" fill="{RED}" text-anchor="middle">{ch}</text>'
                      for x in (166, 252) for i, ch in enumerate("RESTART"))
    letit = "".join(f'<text transform="translate({x} 420) rotate(-80)" font-family="\'Snell Roundhand\',\'Brush Script MT\',cursive" font-size="46" fill="{RED}">Let it B</text>'
                    for x in (128, 214))
    arrows = "".join(f'<path d="M{x} 290 L{x - 4} 360 M{x - 16} 344 L{x - 4} 362 L{x + 6} 342" fill="none" stroke="{RED}" stroke-width="3.2" stroke-linecap="round"/>'
                     for x in (150, 238))
    swirl = f'<path d="M112 130 C100 170 130 186 120 220 M290 150 C300 190 280 214 296 240" fill="none" stroke="{RED}" stroke-width="3" stroke-linecap="round"/>'
    art = garment(JEANS, JEANS_IN, "#262626", inner_c="#7a7a7a", extra=f'<g clip-path="url(#cl)">{restart}{letit}{arrows}{swirl}</g>')
    items["jeans-restart"] = (frame("GR-01-01", "", art, False),
                              frame("GR-01-01", "", zoom(art, (120, 100, 160, 170), [(166, 160, 1, 90, "принт от руки"), (238, 250, 0, 370, "красный, не смоется")]), True))

    # 2. Костюм — куртка (кадр 1) и брюки (кадр 2): беж / лес / олива
    BEIGE, FOREST, OLIVE = "#D8CDB3", "#24492F", "#77713B"
    panels = (f'<g clip-path="url(#cl)"><path d="M40 60 L200 60 L200 176 C160 168 120 196 106 272 L40 300 Z" fill="{FOREST}"/>'
              f'<path d="M360 60 L200 60 L200 176 C240 168 280 196 294 272 L360 300 Z" fill="{FOREST}"/>'
              f'<path d="M120 300 C150 250 178 240 200 248 L200 404 L120 404 Z" fill="{OLIVE}"/>'
              f'<path d="M280 300 C250 250 222 240 200 248 L200 404 L280 404 Z" fill="{OLIVE}" opacity=".9"/></g>')
    collar = f'<path d="{JACKET_COLLAR}" fill="{BEIGE}" stroke="{INK}" stroke-width="1.6" vector-effect="non-scaling-stroke"/><path d="M200 66 L200 98" stroke="{INK}" stroke-width="1"/>'
    jacket = garment(JACKET, JACKET_IN, BEIGE, extra=panels, post=collar)
    pants_panels = (f'<g clip-path="url(#cp)"><path d="M70 120 C120 160 150 260 150 330 C150 390 120 450 110 470 L60 470 Z" fill="{FOREST}"/>'
                    f'<path d="M330 120 C280 160 250 260 250 330 C250 390 280 450 290 470 L340 470 Z" fill="{FOREST}"/>'
                    f'<ellipse cx="150" cy="250" rx="36" ry="70" fill="{OLIVE}"/><ellipse cx="250" cy="250" rx="36" ry="70" fill="{OLIVE}"/></g>')
    pants = garment(PANTS, PANTS_IN, BEIGE, extra=pants_panels, clip="cp")
    items["suit-detour"] = (frame("GR-01-02", "", jacket, False), frame("GR-01-02", "", pants, True))

    # 3. Серые варёные джинсы — красная вышивка-каракули
    w = wash(rng, "cl", "#A7A7A4", ["#7E7E7B", "#C8C8C5", "#8f8f8c"], 12)
    art = garment(JEANS, JEANS_IN, "#A7A7A4", inner_c="#555", extra=w + f'<g clip-path="url(#cl)">{scribbles(rng, 46, RED)}</g>')
    items["jeans-scribble"] = (frame("GR-01-03", "", art, False),
                               frame("GR-01-03", "", zoom(art, (130, 150, 150, 160), [(210, 210, 1, 90, "вышивка нитью"), (165, 280, 0, 370, "варка вручную")]), True))

    # 4. Худи серое варёное, принт-трещины — вид со спины
    hood = f'<path d="{HOOD}" fill="#8F8F8C" stroke="{INK}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>'
    w = wash(rng, "cl", "#8F8F8C", ["#6A6A67", "#B0B0AD", "#5d5d5a"], 12)
    art = hood + garment(HOODIE, HOODIE_IN, "#8F8F8C", inner_c="#333", extra=w + f'<g clip-path="url(#cl)">{cracks(rng, 22, "#151515")}</g>')
    art += f'<path d="M200 40 L200 120" stroke="{INK}" stroke-width="1"/>'
    items["hoodie-crack"] = (frame("GR-01-04", "", art, False),
                             frame("GR-01-04", "", zoom(art, (110, 110, 170, 180), [(200, 190, 1, 90, "принт «трещина»"), (150, 250, 0, 370, "варка: двух одинаковых нет")]), True))

    # 5. Косуха варёная с капюшоном
    hood = f'<path d="{BIKER_HOOD}" fill="#3B3C3B" stroke="{INK}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>'
    w = wash(rng, "cl", "#5A5C5B", ["#3d3f3e", "#7a7c7b", "#4a4c4b"], 14)
    belt = (f'<rect x="120" y="388" width="160" height="16" fill="#3B3C3B" stroke="{INK}" stroke-width="1.2"/>'
            f'<rect x="236" y="384" width="22" height="24" fill="none" stroke="#C9C9C4" stroke-width="2"/>')
    snaps = "".join(f'<circle cx="{x}" cy="{y}" r="3" fill="#C9C9C4"/>' for x, y in ((172, 140), (222, 160), (254, 162), (186, 220)))
    zipl = f'<path d="{BIKER_ZIP}" fill="none" stroke="#C9C9C4" stroke-width="2.4" stroke-dasharray="2 1.5"/><path d="M128 200 L150 260" stroke="#C9C9C4" stroke-width="2"/>'
    art = hood + garment(BIKER, BIKER_IN, "#5A5C5B", inner_c="#1a1a1a", extra=w, post=zipl + snaps + belt)
    items["jacket-biker"] = (frame("GR-01-05", "", art, False),
                             frame("GR-01-05", "", zoom(art, (140, 90, 160, 180), [(216, 170, 1, 90, "косая молния"), (172, 140, 0, 370, "капюшон пришит")]), True))

    # 6. Тёмные джинсы с красной строчкой
    stitch = (f'<g clip-path="url(#cl)" fill="none" stroke="{RED}" stroke-width="1.3" stroke-dasharray="4 3" vector-effect="non-scaling-stroke">'
              '<path d="M132 76 L268 76 M130 88 L270 88 M134 104 C148 126 166 130 178 98 M266 104 C252 126 234 130 222 98 '
              'M206 96 L206 158 C206 170 202 176 198 180 '
              'M114 300 C134 290 160 292 184 306 M118 320 C140 310 162 312 184 326 '
              'M286 300 C266 290 240 292 216 306 M282 320 C260 310 238 312 216 326 '
              'M92 424 L188 430 M212 430 L308 424 M104 260 L96 380 M296 260 L304 380"/></g>')
    art = garment(JEANS, JEANS_IN, "#2C3036", inner_c="#8a8f98", extra=stitch)
    items["jeans-redline"] = (frame("GR-01-06", "", art, False),
                              frame("GR-01-06", "", zoom(art, (110, 240, 160, 170), [(150, 300, 1, 370, "строчка красной нитью"), (250, 316, 0, 90, "дуги на коленях")]), True))

    # 7. Белая футболка — бланк, жаккардовая бирка
    art = garment(TEE, TEE_IN, "#FFFFFF", inner_c="#777", post=jacquard(124, 382))
    items["tee-blank"] = (frame("GR-01-07", "", art, False),
                          frame("GR-01-07", "", zoom(art, (100, 330, 120, 110), [(133, 391, 1, 90, "жаккардовая G"), (180, 406, 0, 370, "плотный хлопок")]), True))

    # 8. Белый лонгслив — бланк
    art = garment(LONG, LONG_IN, "#FFFFFF", inner_c="#777", post=jacquard(126, 382))
    items["longsleeve-blank"] = (frame("GR-01-08", "", art, False),
                                 frame("GR-01-08", "", zoom(art, (40, 300, 140, 130), [(83, 396, 1, 90, "манжета в рубчик"), (135, 391, 1, 370, "жаккардовая G")]), True))
    return items

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for pid, (a, b) in build().items():
        for n, svg in ((1, a), (2, b)):
            p = OUT / f"{pid}-{n}.svg"
            p.write_text(svg, encoding="utf-8")
            total += len(svg.encode())
    print(f"img: {total/1024:.0f} КБ")
