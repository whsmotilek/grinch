#!/usr/bin/env python3
"""GRINCHIN v3 · нарисованные вещи дропа 01 (K3). Детерминирован: python3 src/img/_gen.py (из site/).

Что пишет (SVG без лент и надписей внутри рисунка, фон прозрачный — бумагу даёт карточка):
  img/<id>-1.svg        чистый флэт «техкарта в покое» — основа стилей a и d, запасная картинка K1 (products.js)
  img/<id>-2.svg        кадр «деталь»: большая лупа + маленькая вещь с пунктиром (2-й кадр галереи товара)
  img/art/<id>-b.svg    стиль b «маркер»: живая линия в два прохода, заливка-плашка со сдвигом (ризограф)
  img/art/<id>-c.svg    стиль c «деталь»: вещь меньше и левее + лупа + нитка к навесной бирке
  img/art/<id>-n.svg    пометка от руки (только буквы, контурами, с бумажной обводкой) — кладётся поверх рисунка
  img/art/tag.svg       навесная бирка: чёрная, вертикальное НОВОЕ лого GRiNCHiN (v3/logo/logo_p1.svg)
и блок данных между /*<gen> … /*</gen>*/ в src/cards-art.js (пути ассетов, выноски, пометки, стрелки).

Правила (R3 + SPEC_V3):
- одна линия пола у всех вещей (FLOOR), масштаб общий внутри категории (низ / верх), под вещью мягкая тень;
- заливка — настоящий цвет вещи; фактура приёмом: вафля — сетка, распыление и варка — мягкие пятна
  (радиальные градиенты, без feGaussianBlur), вышивка — нить с петлями, строчка — пунктир;
- принт точно по фото (RESTART. столбиком, стрелка ↙, «Let it B» снизу вверх; каракули вышивкой; трещины);
- лайм #8ED308 в рисунках — только жаккардовая G на чёрной бирке у подола (как на фото pg-015-038);
- ≤ 12 КБ на файл: относительные команды, целые/1 знак, повторы через <use>.
Шрифты принтов и пометок — системные Brush Script / Bradley Hand, переведены в контуры (в SVG шрифтов нет).
"""
from __future__ import annotations
import math, random, re, json, pathlib
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

HERE = pathlib.Path(__file__).parent              # site/src/img
ART = HERE / "art"; ART.mkdir(exist_ok=True)
JS = HERE.parent / "cards-art.js"
LOGO = pathlib.Path.home() / "Проекты/GV/v3/logo"

PAPER = "#F4F3F3"; INK = "#141414"; LIME = "#8ED308"; LIGHT = "#F2F1EE"
W, H = 400, 500
FLOOR = 420                                        # 84 % высоты плитки — как в v2
SCALE = {"bottom": .9, "top": .86, "suit": .64}

# ============================================================== пути: разбор, сериализация, искажение
NUM = r"[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?"

def parse(d: str) -> list[dict]:
    """Любой путь (абс./отн., M L H V C S Q T Z) → подпути [{s:(x,y), g:[('L',x,y)|('C',…)|('Q',…)], z:bool}]."""
    toks = re.findall(r"[MmLlHhVvCcSsQqTtZz]|" + NUM, d)
    subs: list[dict] = []; cur = None; i = 0; cmd = ""; x = y = 0.0; lc = None
    def n():
        nonlocal i
        v = float(toks[i]); i += 1; return v
    while i < len(toks):
        t = toks[i]
        if t[0].isalpha():
            cmd = t; i += 1
            if cmd in "Zz":
                if cur: cur["z"] = True; x, y = cur["s"]; subs.append(cur); cur = None
                lc = None
                continue
        rel = cmd.islower(); C = cmd.upper(); ox, oy = (x, y) if rel else (0.0, 0.0)
        if C == "M":
            if cur: subs.append(cur)
            x, y = ox + n(), oy + n(); cur = {"s": (x, y), "g": [], "z": False}
            cmd = "l" if rel else "L"; lc = None; continue
        if cur is None: cur = {"s": (x, y), "g": [], "z": False}
        if C == "L": x, y = ox + n(), oy + n(); cur["g"].append(("L", x, y)); lc = None
        elif C == "H": x = ox + n(); cur["g"].append(("L", x, y)); lc = None
        elif C == "V": y = oy + n(); cur["g"].append(("L", x, y)); lc = None
        elif C == "C":
            x1, y1, x2, y2, x3, y3 = ox + n(), oy + n(), ox + n(), oy + n(), ox + n(), oy + n()
            cur["g"].append(("C", x1, y1, x2, y2, x3, y3)); x, y = x3, y3; lc = ("C", x2, y2)
        elif C == "S":
            x1, y1 = (2 * x - lc[1], 2 * y - lc[2]) if lc and lc[0] == "C" else (x, y)
            x2, y2, x3, y3 = ox + n(), oy + n(), ox + n(), oy + n()
            cur["g"].append(("C", x1, y1, x2, y2, x3, y3)); x, y = x3, y3; lc = ("C", x2, y2)
        elif C == "Q":
            x1, y1, x3, y3 = ox + n(), oy + n(), ox + n(), oy + n()
            cur["g"].append(("Q", x1, y1, x3, y3)); x, y = x3, y3; lc = ("Q", x1, y1)
        elif C == "T":
            x1, y1 = (2 * x - lc[1], 2 * y - lc[2]) if lc and lc[0] == "Q" else (x, y)
            x3, y3 = ox + n(), oy + n(); cur["g"].append(("Q", x1, y1, x3, y3)); x, y = x3, y3; lc = ("Q", x1, y1)
        else:
            raise ValueError(cmd)
    if cur: subs.append(cur)
    return subs

def xform(subs: list[dict], a: float, b: float, c: float, d: float, e: float, f: float) -> list[dict]:
    """Аффинное преобразование matrix(a b c d e f)."""
    T = lambda x, y: (a * x + c * y + e, b * x + d * y + f)
    out = []
    for s in subs:
        g = []
        for seg in s["g"]:
            pts = [T(seg[k], seg[k + 1]) for k in range(1, len(seg), 2)]
            g.append((seg[0], *[v for p in pts for v in p]))
        out.append({"s": T(*s["s"]), "g": g, "z": s["z"]})
    return out

def _f(v: float, p: int) -> str:
    s = f"{v:.{p}f}"
    if "." in s: s = s.rstrip("0").rstrip(".")
    if s in ("-0", ""): s = "0"
    if s.startswith("0."): s = s[1:]
    elif s.startswith("-0."): s = "-" + s[2:]
    return s

def ser(subs, p: int = 1, q: float = 0) -> str:
    """Компактная строка: относительные команды, округление на сетку 10^-p (или шаг q), h/v, без повторов букв."""
    if isinstance(subs, str): subs = parse(subs)
    R = (lambda v: round(round(v / q) * q, p)) if q else (lambda v: round(v, p))
    out: list[str] = []; st_ = {"last": "", "prev": ""}
    def emit(c: str, nums: list[float]) -> None:
        for k, v in enumerate(nums):
            t = _f(v, p)
            if k == 0 and c != st_["last"]:
                out.append(c + t)
            elif t.startswith("-") or (t.startswith(".") and "." in st_["prev"]):
                out.append(t)
            else:
                out.append(" " + t)
            st_["prev"] = t
        st_["last"] = c if c != "m" else "l"
    px = py = 0.0
    for sp in subs:
        sx, sy = R(sp["s"][0]), R(sp["s"][1])
        st_["last"] = ""
        emit("m", [sx - px, sy - py]); px, py = sx, sy
        for seg in sp["g"]:
            pts = [(R(seg[k]), R(seg[k + 1])) for k in range(1, len(seg), 2)]
            ex, ey = pts[-1]
            if seg[0] == "L":
                dx, dy = ex - px, ey - py
                if abs(dx) < 1e-9 and abs(dy) < 1e-9: continue
                if abs(dy) < 1e-9: emit("h", [dx])
                elif abs(dx) < 1e-9: emit("v", [dy])
                else: emit("l", [dx, dy])
            else:
                emit(seg[0].lower(), [v for q in pts for v in (q[0] - px, q[1] - py)])
            px, py = ex, ey
        if sp["z"]:
            out.append("z"); st_["last"] = "z"; px, py = sx, sy
    return "".join(out)

def flatten(sp: dict, steps: int = 10) -> list[tuple[float, float]]:
    pts = [sp["s"]]; x, y = sp["s"]
    for seg in sp["g"]:
        if seg[0] == "L": pts.append((seg[1], seg[2]))
        elif seg[0] == "C":
            _, x1, y1, x2, y2, x3, y3 = seg
            for k in range(1, steps + 1):
                t = k / steps; u = 1 - t
                pts.append((u**3*x + 3*u*u*t*x1 + 3*u*t*t*x2 + t**3*x3, u**3*y + 3*u*u*t*y1 + 3*u*t*t*y2 + t**3*y3))
        else:
            _, x1, y1, x3, y3 = seg
            for k in range(1, steps + 1):
                t = k / steps; u = 1 - t
                pts.append((u*u*x + 2*u*t*x1 + t*t*x3, u*u*y + 2*u*t*y1 + t*t*y3))
        x, y = pts[-1]
    if sp["z"]: pts.append(sp["s"])
    return pts

def resample(pts, step: float):
    out = [pts[0]]
    for a, b in zip(pts, pts[1:]):
        L = math.dist(a, b); k = max(1, int(L / step))
        for j in range(1, k + 1):
            out.append((a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k))
    return out

def rough(d: str, rng: random.Random, amp: float = 1.2, over: float = 5, step: float = 7) -> list[dict]:
    """Линия «маркером»: плавный шум по нормали; замкнутые контуры не смыкаются ровно, открытые — с перехлёстом."""
    res = []
    for sp in parse(d):
        pts = flatten(sp)
        if len(pts) < 2: continue
        if sp["z"] and len(pts) > 2: pts = pts + [pts[1], pts[2]]
        p = resample(pts, step)
        ph1, ph2 = rng.uniform(0, 6.3), rng.uniform(0, 6.3)
        wl1, wl2 = rng.uniform(28, 46), rng.uniform(9, 14)
        acc = 0.0; q = []
        for j, (x, y) in enumerate(p):
            a = p[max(j - 1, 0)]; b = p[min(j + 1, len(p) - 1)]
            nx, ny = -(b[1] - a[1]), b[0] - a[0]; nl = math.hypot(nx, ny) or 1
            if j: acc += math.dist(p[j - 1], p[j])
            off = amp * (math.sin(acc / wl1 + ph1) + .35 * math.sin(acc / wl2 + ph2))
            q.append((x + nx / nl * off, y + ny / nl * off))
        if not sp["z"] and over and len(q) > 1:
            for end in (0, -1):
                a, b = (q[0], q[1]) if end == 0 else (q[-1], q[-2])
                L = math.dist(a, b) or 1; e = rng.uniform(.4, 1) * over
                ext = (a[0] + (a[0] - b[0]) / L * e, a[1] + (a[1] - b[1]) / L * e)
                q.insert(0, ext) if end == 0 else q.append(ext)
        res.append({"s": q[0], "g": [("L", x, y) for x, y in q[1:]], "z": False})
    return res

def bbox(subs: list[dict]) -> tuple[float, float, float, float]:
    xs, ys = [], []
    for sp in subs:
        for x, y in flatten(sp, 6): xs.append(x); ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)

# ============================================================== шрифт → контуры
class SubsPen(BasePen):
    def __init__(self, gs, m):
        super().__init__(gs); self.m = m; self.subs: list[dict] = []; self.cur = None
    def T(self, p): a, b, c, d, e, f = self.m; return (a * p[0] + c * p[1] + e, b * p[0] + d * p[1] + f)
    def _moveTo(self, p): self.cur = {"s": self.T(p), "g": [], "z": False}; self.subs.append(self.cur)
    def _lineTo(self, p): self.cur["g"].append(("L", *self.T(p)))
    def _curveToOne(self, a, b, c): self.cur["g"].append(("C", *self.T(a), *self.T(b), *self.T(c)))
    def _qCurveToOne(self, a, b): self.cur["g"].append(("Q", *self.T(a), *self.T(b)))
    def _closePath(self): self.cur["z"] = True
    def _endPath(self): pass

_fonts: dict[str, TTFont] = {}
def font(key: str) -> TTFont:
    F = "/System/Library/Fonts/Supplemental/"
    if key not in _fonts:
        _fonts[key] = TTFont({"script": F + "Brush Script.ttf", "hand": F + "Bradley Hand Bold.ttf"}[key])
    return _fonts[key]

def glyphs(s: str, key: str, size: float, track: float = 0) -> tuple[list[dict], float]:
    """Строка → контуры с базовой линией y=0 (x от 0) и ширина."""
    f = font(key); gs = f.getGlyphSet(); cmap = f.getBestCmap(); k = size / f["head"].unitsPerEm
    subs: list[dict] = []; x = 0.0
    for ch in s:
        g = cmap.get(ord(ch))
        if g is None: x += size * .3; continue
        pen = SubsPen(gs, (k, 0, 0, -k, x, 0)); gs[g].draw(pen); subs += pen.subs
        x += gs[g].width * k + track
    return subs, x - track

# ============================================================== примитивы SVG
def st(d: str, w: float = 1, c: str = INK, o: float = 1, dash: str = "", cap: str = "round", extra: str = "") -> str:
    da = f' stroke-dasharray="{dash}"' if dash else ""
    op = f' stroke-opacity="{o}"' if o != 1 else ""
    lc = "" if cap == "butt" else f' stroke-linecap="{cap}"'
    return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}"{lc} stroke-linejoin="round"{da}{op}{extra}/>'

def fl(d: str, c: str, o: float = 1, extra: str = "") -> str:
    return f'<path d="{d}" fill="{c}"' + (f' fill-opacity="{o}"' if o != 1 else "") + f"{extra}/>"

class Pen:
    """Как рисуем: clean — ровная линия в три толщины; marker — от руки, заливка «плашкой» со сдвигом."""
    def __init__(self, mode: str, seed: int):
        self.mode = mode; self.rng = random.Random(seed); self.cid = 0
    @property
    def mk(self) -> bool: return self.mode == "marker"
    def plate(self, d: str, c: str) -> str:
        d = ser(d, 0)
        return f'<path d="{d}" fill="{c}" transform="translate(6 5)"/>' if self.mk else fl(d, c)
    def clip(self, d: str, inner: str, shift: tuple[int, int] = (3, 2)) -> str:
        """Принт/фактура внутри формы. В маркере — своя «форма» со своим сдвигом, как у неприводки."""
        self.cid += 1; cid = f"k{self.cid}"
        g = f'<clipPath id="{cid}"><path d="{ser(d, 0)}"/></clipPath><g clip-path="url(#{cid})">{inner}</g>'
        return f'<g transform="translate({shift[0]} {shift[1]})">{g}</g>' if self.mk else g
    def seam(self, d: str, c: str = INK, o: float = .35, w: float = 1) -> str:
        if self.mk: return st(ser(rough(d, self.rng, .9, 3), 0), 1.3, INK, .8)
        return st(ser(d, 1), w, c, o)
    def stitch(self, d: str, c: str = INK, o: float = .45, w: float = .9, dash: str = "3 2.6") -> str:
        if self.mk:
            keep = c if c not in (LIGHT, INK, "#000") else INK
            return st(ser(rough(d, self.rng, .6, 0, 6), 0), w + .3, keep, min(1, o + .25), "4 3.5", "butt")
        return st(ser(d, 1), w, c, o, dash, "butt")
    def outline(self, d: str, w: float = 1.7) -> str:
        if self.mk:
            return (st(ser(rough(d, self.rng, 1.3, 6, 8), 0), 2.2, INK, .92) +
                    st(ser(rough(d, self.rng, 1.7, 9, 9), 0), .8, INK, .5))
        return st(ser(d, 1), w)

def radial_defs(gid: str, c: str, o: float = .75) -> str:
    return (f'<radialGradient id="{gid}"><stop offset="0" stop-color="{c}" stop-opacity="{o}"/>'
            f'<stop offset="1" stop-color="{c}" stop-opacity="0"/></radialGradient>')

def blobs(gid: str, spots: list[tuple]) -> str:
    """Мягкие пятна (распыление, варка): эллипсы с радиальным градиентом — дешевле фильтра размытия."""
    out = []
    for s in spots:
        x, y, rx, ry = s[:4]; r = s[4] if len(s) > 4 else 0
        out.append(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="url(#{gid})"'
                   + (f' transform="rotate({r} {x} {y})"' if r else "") + "/>")
    return "".join(out)

def scatter(rng: random.Random, n: int, box: tuple, rx: tuple, ry: tuple) -> list[tuple]:
    x0, y0, x1, y1 = box
    return [(round(rng.uniform(x0, x1)), round(rng.uniform(y0, y1)), round(rng.uniform(*rx)), round(rng.uniform(*ry)),
             round(rng.uniform(-40, 40))) for _ in range(n)]

# ============================================================== новая G со стрелкой (жаккард)
def g_mark() -> tuple[list[dict], tuple]:
    src = (LOGO / "grinchin_new.svg").read_text()
    ps = re.findall(r'<path[^>]*?d="([^"]+)"', src, re.S)
    d = [p for p in ps if p.strip().startswith("M203.1,342.8")][0]
    subs = parse(d); return subs, bbox(subs)

def jacquard(x: float, y: float, s: float = 15) -> str:
    """Тканая бирка G у подола: чёрный квадрат, лаймовая G (как на фото pg-015-038)."""
    subs, (x0, y0, x1, y1) = g_mark()
    k = s * .72 / max(x1 - x0, y1 - y0)
    m = xform(subs, k, 0, 0, k, x + (s - (x1 - x0) * k) / 2 - x0 * k, y + (s - (y1 - y0) * k) / 2 - y0 * k)
    return f'<rect x="{x}" y="{y}" width="{s}" height="{s}" fill="#111"/>' + fl(ser(m, 1), LIME)

# ============================================================== 01 · ДЖИНСЫ RESTART
DENIM, DENIM_HI, RED = "#1C1C1F", "#333338", "#D3232B"
JEANS = ("M122 62 L278 62 L282 80 C290 112 292 138 292 162 L306 452 L206 452 L200 206 L194 452 "
         "L94 452 L108 162 C108 138 110 112 118 80 Z")

def leg_x(y: float, f: float) -> float:
    """Точка на левой штанине на высоте y: f=0 — внешний край, f=1 — шаговый шов."""
    xo = 108 + (162 - y) / 82 * 10 if y < 162 else 108 - (y - 162) / 290 * 14
    xi = 200 if y < 206 else 200 - (y - 206) / 246 * 6
    return xo + (xi - xo) * f

def restart_print() -> str:
    """Левая штанина по фото: «Let it» у внешнего края, RESTART. столбиком, стрелка ↙, «Let it B» снизу вверх.
    Правая — та же раскладка (не зеркально): <use> со сдвигом и лёгким скосом (штанина расширяется к низу)."""
    parts = []; y = 104; caps = []
    for ch in "RESTART.":
        s, w = glyphs(ch, "hand", 19)
        caps += xform(s, 1, 0, 0, 1, leg_x(y, .47) - w / 2, y); y += 21.5
    parts.append(f'<path d="{ser(caps, 1, .5)}" fill="{RED}" stroke="{RED}" stroke-width=".9"/>')
    x1, x2 = leg_x(292, .44), leg_x(372, .40)
    parts.append(st(ser(f"M{x1:.1f} 292 C{x1 - 1:.1f} 320 {x2 + 2:.1f} 350 {x2:.1f} 376 L{x2 + 17:.1f} 362", 1), 3.4, RED))
    s, w = glyphs("Let it B", "script", 46)
    x0, y0 = leg_x(446, .80), 446; xe, ye = leg_x(140, .80), 140
    ang = math.atan2(ye - y0, xe - x0); k = math.dist((x0, y0), (xe, ye)) / w
    ca, sa = math.cos(ang), math.sin(ang)
    parts.append(fl(ser(xform(s, ca * k, sa * k, -sa, ca, x0 + 13, y0), 0), RED))
    s2, w2 = glyphs("Let it", "script", 24)
    ca, sa = math.cos(math.radians(-91)), math.sin(math.radians(-91)); k2 = 128 / w2
    parts.append(fl(ser(xform(s2, ca * k2, sa * k2, -sa, ca, leg_x(236, .16) + 7, 236), 0), RED))
    dx = lambda yy: 400 - (leg_x(yy, 0) + leg_x(yy, 1))   # сдвиг левой раскладки на правую штанину
    b = (dx(440) - dx(160)) / 280; a = dx(160) - b * 160
    return f'<g id="lp">{"".join(parts)}</g><use href="#lp" xlink:href="#lp" transform="matrix(1 0 {b:.4f} 1 {a:.1f} 0)"/>'

def jeans_restart(p: Pen) -> str:
    g = (f'<linearGradient id="wash" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{DENIM}"/>'
         f'<stop offset=".38" stop-color="{DENIM_HI}"/><stop offset="1" stop-color="{DENIM}"/></linearGradient>')
    out = (p.plate(JEANS, "#252528") if p.mk else g + fl(ser(JEANS, 0), "url(#wash)"))
    out += p.clip(JEANS, restart_print())
    sc, so = LIGHT, .3
    out += p.seam("M118 80 L282 80 M138 60 L138 84 M170 60 L170 84 M230 60 L230 84 M262 60 L262 84", sc, so)
    out += p.seam("M200 80 L200 204 M120 92 C138 118 160 120 168 82 M280 92 C262 118 240 120 232 82", sc, so)
    out += p.stitch("M124 70 L276 70 M212 84 L212 160 C212 172 206 180 200 184 M246 92 L264 92 L263 108 L247 108 Z "
                    "M98 442 L195 442 M205 442 L302 442", sc, so + .1)
    if not p.mk:
        out += ('<circle cx="200" cy="71" r="3" fill="#B9B6AE"/><circle cx="168" cy="84" r="1.8" fill="#B9B6AE"/>'
                '<circle cx="232" cy="84" r="1.8" fill="#B9B6AE"/>')
    return out + p.outline(JEANS)

# ============================================================== 02 · КОСТЮМ ОБЪЕЗД (ветровка + брюки комплектом)
BEIGE, FOREST, OLIVE = "#D9CDAE", "#24533A", "#706B35"
JK_ALL = ("M150 96 L116 120 C96 150 84 220 74 330 L74 352 L110 356 L114 330 L116 290 L116 380 L284 380 L284 290 "
          "L286 330 L290 356 L326 352 L326 330 C316 220 304 150 284 120 L250 96 Z")
JK_COLLAR = "M158 64 L242 64 L250 98 C230 106 170 106 150 98 Z"
PN = ("M128 60 L272 60 L276 84 C290 200 304 320 312 430 L306 452 L212 456 L200 196 L188 456 "
      "L94 452 L88 430 C96 320 110 200 124 84 Z")
SL_ARC = "M60 168 C80 196 108 204 130 196 M340 168 C320 196 292 204 270 196"
BODY_ARC = "M116 196 C150 214 168 252 170 300 C172 330 186 360 200 380 M284 196 C250 214 232 252 230 300 C228 330 214 360 200 380"
PN_ARC = ("M126 84 C122 160 150 250 176 330 C160 370 128 400 92 426 "
          "M274 84 C278 160 250 250 224 330 C240 370 272 400 308 426")
PN_OVAL = ("M102 150 C118 140 140 160 146 200 C152 250 150 290 132 300 C112 300 104 260 102 220 Z "
           "M298 150 C282 140 260 160 254 200 C248 250 250 290 268 300 C288 300 296 260 298 220 Z")

def suit_detour(p: Pen) -> str:
    """По фото: на рукаве бежевая «шапка» с круглым краем → лесной пояс → олива к манжете; на полочке лесная дуга
    из-под руки к низу, олива у подола; резинка по низу и на манжетах. Брюки: лесной лампас-дуга с оливковым
    овалом на бедре, к голени сходится клином, низ бежевый. Ветровка надета поверх брюк — комплект целиком."""
    jk = (fl(ser("M60 168 C80 196 108 204 130 196 L130 262 C110 264 80 260 60 252 Z "
                 "M340 168 C320 196 292 204 270 196 L270 262 C290 264 320 260 340 252 Z", 0), FOREST) +
          fl(ser("M60 252 C80 260 110 264 130 262 L130 380 L60 380 Z M340 252 C320 260 290 264 270 262 L270 380 L340 380 Z", 0), OLIVE) +
          fl(ser("M116 196 C150 214 168 252 170 300 C172 330 186 360 200 380 L116 380 Z "
                 "M284 196 C250 214 232 252 230 300 C228 330 214 360 200 380 L284 380 Z", 0), FOREST) +
          fl(ser("M116 318 C140 326 158 346 168 380 L116 380 Z M284 318 C260 326 242 346 232 380 L284 380 Z "
                 "M110 358 L290 358 L290 384 L110 384 Z", 0), OLIVE))
    pn = (fl(ser("M80 84 L126 84 C122 160 150 250 176 330 C160 370 128 400 92 426 L80 426 Z "
                 "M320 84 L274 84 C278 160 250 250 224 330 C240 370 272 400 308 426 L320 426 Z", 0), FOREST) +
          fl(ser(PN_OVAL, 0), OLIVE))
    pn += st(ser(PN_ARC + " " + PN_OVAL, 1), 1, INK, .4) if not p.mk else ""
    jk += st(ser(SL_ARC + " " + BODY_ARC + " M60 252 C80 260 110 264 130 262 M340 252 C320 260 290 264 270 262", 1), 1, INK, .45) if not p.mk else ""
    pants = (p.plate(PN, BEIGE) + p.clip(PN, pn) +
             p.seam("M124 84 L276 84 M200 84 L200 190 M88 430 L190 438 M210 438 L312 430", INK, .3) +
             p.stitch("M130 72 C150 76 170 68 190 74 C210 80 230 68 250 74 C260 76 268 72 272 72", INK, .4) +
             (p.seam(PN_ARC + " " + PN_OVAL, INK, .4) if p.mk else "") + p.outline(PN))
    jacket = (p.plate(JK_ALL, BEIGE) + p.clip(JK_ALL, jk) +
              p.seam("M116 150 L116 380 M284 150 L284 380", INK, .35) +
              (p.seam(BODY_ARC, INK, .45) if p.mk else "") +
              p.stitch("M116 364 L284 364 M116 370 L284 370 M116 376 L284 376 M76 340 L110 343 M76 346 L110 349 "
                       "M290 343 L324 340 M290 349 L324 346", INK, .35, .7, "1.5 2") +
              p.plate(JK_COLLAR, BEIGE) + p.seam("M164 74 L236 74 M162 83 L238 83", FOREST, .95, 1.8) + p.outline(JK_COLLAR) +
              p.seam("M200 102 L200 380", INK, .9, 1.3) + p.stitch("M195 104 L195 376 M205 104 L205 376", INK, .4) +
              ("" if p.mk else f'<rect x="196" y="98" width="8" height="12" rx="1.5" fill="#CFCBC0" stroke="{INK}" stroke-width=".6"/>') +
              p.outline(JK_ALL))
    # подол ветровки (380) ложится на брюки на уровне ~150 их высоты; низ брюк — на полу (hem 596)
    return f'<g transform="translate(0 140)">{pants}</g><g transform="translate(0 -88)">{jacket}</g>'

# ============================================================== 03 · ДЖИНСЫ КАРАКУЛИ
GREY, GREY_D, GREY_L, THREAD = "#8E8F8B", "#55565A", "#C9C8C2", "#7A1E32"
JS_ = ("M126 60 L274 60 L280 84 C298 140 314 230 318 330 C320 380 316 420 312 452 L212 456 L200 200 L188 456 "
       "L88 452 C84 420 80 380 82 330 C86 230 102 140 120 84 Z")

def scribble(rng: random.Random, x: float, y: float, n: int, step: float = 6.5) -> str:
    """Каракули нитью (фото 03): длинная нить гуляет плавно и то и дело закладывает петлю радиусом 6–12.
    Сглаживание — квадратичный B-сплайн через T (2 числа на отрезок, как у ломаной, но петли круглые)."""
    a = rng.uniform(0, 6.3); turn = 0.0; curl = 0; dirn = 1; pts = [(x, y)]
    for _ in range(n):
        if curl <= 0 and rng.random() < .12:
            curl = rng.randint(8, 11); dirn = rng.choice((-1, 1))
        if curl > 0:
            turn = dirn * step / rng.uniform(6.5, 11); curl -= 1
        else:
            turn = turn * .6 + rng.uniform(-.35, .35)
        a += turn
        x += math.cos(a) * step; y += math.sin(a) * step; pts.append((round(x), round(y)))
    mid = lambda p0, p1: (round((p0[0] + p1[0]) / 2), round((p0[1] + p1[1]) / 2))
    m1 = mid(pts[1], pts[2])
    d = f"M{pts[0][0]} {pts[0][1]}q{_f(pts[1][0] - pts[0][0], 1)} {_f(pts[1][1] - pts[0][1], 1)} {_f(m1[0] - pts[0][0], 1)} {_f(m1[1] - pts[0][1], 1)}t"
    cur = m1; parts = []
    for i in range(2, len(pts) - 1):
        m = mid(pts[i], pts[i + 1])
        parts.append(f"{_f(m[0] - cur[0], 1)} {_f(m[1] - cur[1], 1)}"); cur = m
    return d + " ".join(parts).replace(" -", "-")

def jeans_scribble(p: Pen) -> str:
    rng = random.Random(33)
    defs = radial_defs("gd", GREY_D, .5) + radial_defs("gl", GREY_L, .65)
    wash = blobs("gd", scatter(rng, 14, (90, 90, 310, 440), (16, 30), (24, 48))) + \
           blobs("gl", scatter(rng, 9, (100, 120, 300, 430), (12, 24), (16, 34)))
    sc = []
    for col in range(5):
        for row in range(7):
            x = 98 + col * 50 + rng.uniform(-12, 12); y = 92 + row * 52 + rng.uniform(-10, 10)
            sc.append(scribble(rng, x, y, 26))
    # плотность как на фото: та же нить ещё дважды — повёрнутой и со сдвигом (повторы через <use>, байты не растут)
    thread = (f'<g id="sc">{st("".join(sc), .55, THREAD, .85)}</g>'
              '<use href="#sc" xlink:href="#sc" transform="rotate(180 200 270)"/>'
              '<use href="#sc" xlink:href="#sc" transform="translate(22 -25)"/>')
    out = (defs if not p.mk else "") + p.plate(JS_, GREY) + p.clip(JS_, ("" if p.mk else wash) + thread, (2, 2))
    out += p.seam("M120 84 L280 84 M200 84 L200 196 M124 92 C140 118 160 122 170 86 M276 92 C260 118 240 122 230 86", INK, .3)
    out += p.seam("M150 140 C128 230 128 330 150 452 M250 140 C272 230 272 330 250 452", INK, .28)
    out += p.stitch("M124 72 L276 72 M210 86 L210 160 C210 172 205 180 200 184 M92 444 L190 448 M210 448 L308 444", INK, .35)
    out += p.seam("M140 58 L140 86 M170 58 L170 86 M230 58 L230 86 M260 58 L260 86", INK, .4)
    if not p.mk: out += '<circle cx="200" cy="71" r="3" fill="#E4E2DC" stroke="#555" stroke-width=".5"/>'
    return out + p.outline(JS_)

# ============================================================== 04 · ХУДИ ТРЕЩИНА (спина)
GRAPH, GRAPH_HI, GRAPH_LO = "#4B4D50", "#8C8F93", "#2A2B2D"
HOOD = "M128 132 C122 88 156 58 200 56 C244 58 278 88 272 132 C268 162 236 192 200 206 C164 192 132 162 128 132 Z"
HOODIE = ("M150 112 L106 128 C84 156 74 250 64 366 L66 390 L106 392 L108 370 L112 258 L112 400 L288 400 L288 258 "
          "L292 370 L294 392 L334 390 L336 366 C326 250 316 156 294 128 L250 112 C234 120 218 122 200 122 "
          "C182 122 166 120 150 112 Z")

def crack_net(rng: random.Random, starts) -> str:
    out = []
    for sx, sy, a0 in starts:
        x, y, ang = sx, sy, a0; d = f"M{x:.0f} {y:.0f}"
        for _ in range(rng.randint(7, 11)):
            ang = max(-.9, min(.9, ang + rng.uniform(-.55, .55))); ln = rng.uniform(8, 15)
            x, y = x + math.cos(ang) * ln, y + math.sin(ang) * ln; d += f" L{x:.0f} {y:.0f}"
            if rng.random() < .3:
                ba = ang + rng.choice((-1, 1)) * rng.uniform(.8, 1.4); bl = rng.uniform(6, 12)
                d += f" M{x:.0f} {y:.0f} L{x + math.cos(ba) * bl:.0f} {y + math.sin(ba) * bl:.0f} M{x:.0f} {y:.0f}"
        out.append(d)
    return " ".join(out)

def hoodie_crack(p: Pen) -> str:
    rng = random.Random(21)
    body_cr = crack_net(rng, [(80, 200, .25), (120, 180, -.15), (150, 240, .35), (110, 300, -.2), (170, 340, .15),
                              (90, 270, .5), (214, 196, .2), (230, 290, -.35), (250, 356, -.1), (140, 372, -.05)])
    hood_cr = crack_net(rng, [(150, 96, .5), (196, 130, -.3), (150, 160, .1)])
    spots = [(150, 200, 46, 30), (250, 170, 40, 26), (210, 300, 54, 34), (120, 340, 30, 40), (300, 300, 22, 50),
             (84, 260, 16, 40), (176, 74, 30, 20), (236, 110, 26, 16)]
    defs = (radial_defs("sp", GRAPH_HI, .7) +
            '<pattern id="wf" width="3.2" height="3.2" patternUnits="userSpaceOnUse">'
            '<path d="M0 0H3.2M0 0V3.2" stroke="#000" stroke-opacity=".26" stroke-width=".7"/></pattern>'
            f'<linearGradient id="hem" x1="0" y1="0" x2="0" y2="1"><stop offset=".7" stop-color="{GRAPH_LO}" stop-opacity="0"/>'
            f'<stop offset="1" stop-color="{GRAPH_LO}" stop-opacity=".85"/></linearGradient>')
    crk = lambda d: st(ser(d, 0), 1.7, "#0B0B0C", .9)
    tex = "" if p.mk else blobs("sp", spots) + '<rect x="60" y="40" width="280" height="380" fill="url(#wf)"/>'
    # чёрная вставка по внешней стороне рукава (на фото — от плеча вниз) и боковая молния слева внизу
    insert = ("M92 146 L106 136 C104 180 100 220 96 256 L80 262 C82 222 86 182 92 146 Z "
              "M308 146 L294 136 C296 180 300 220 304 256 L320 262 C318 222 314 182 308 146 Z")
    out = ("" if p.mk else defs) + p.plate(HOODIE, GRAPH)
    out += p.clip(HOODIE, tex + ("" if p.mk else '<rect x="60" y="40" width="280" height="380" fill="url(#hem)"/>') +
                  fl(ser(insert, 0), "#161617") + crk(body_cr))
    out += p.seam("M106 128 C110 170 112 220 112 258 M294 128 C290 170 288 220 288 258 M65 370 L108 372 M292 372 L335 370 "
                  "M112 380 L288 380", LIGHT, .28)
    if not p.mk:
        raw = "".join(f"M{106 + i / 9 * 6:.0f} {128 + i / 9 * 130:.0f}l-4 3" for i in range(10)) + \
              "".join(f"M{294 - i / 9 * 6:.0f} {128 + i / 9 * 130:.0f}l4 3" for i in range(10))
        out += st(raw, .9, LIGHT, .35)
        rib = "".join(f"M{116 + i * 8} 382v16" for i in range(22)) + "".join(f"M{70 + i * 7} 373v16M{296 + i * 7} 373v16" for i in range(6))
        out += st(rib, .7, "#000", .35)
        out += (st("M114 300V378", 2.2, "#1A1A1B") + st("M114 300V378", 1.2, "#9A9894", 1, "1.4 1.6", "butt") +
                '<rect x="111" y="374" width="6" height="11" rx="1.5" fill="#C9C6BF"/>')
    else:
        out += p.stitch("M116 386 L284 386 M116 394 L284 394", INK, .35) + p.seam("M114 300 L114 378", INK, .6)
    out += p.outline(HOODIE)
    out += p.plate(HOOD, "#55575B" if p.mk else GRAPH)                # капюшон лежит на спине поверх полотна
    out += p.clip(HOOD, tex + crk(hood_cr))
    out += p.seam("M200 58 L200 204", LIGHT, .28) + p.seam("M146 156 C170 182 230 182 254 156", "#000", .25)
    return out + p.outline(HOOD)

# ============================================================== 05 · КОСУХА КАПЮШОН
JK_G, JK_HI, JK_LAP, METAL = "#393B40", "#7B7E84", "#45484E", "#D5D3CC"
BK = ("M156 92 L104 110 C86 172 78 270 72 372 L108 378 L118 250 L120 400 L280 400 L282 250 "
      "L292 378 L328 372 C322 270 314 172 296 110 L244 92 Z")
BK_HOOD = "M146 100 C132 56 162 26 200 26 C238 26 268 56 254 100 C238 110 218 114 200 114 C182 114 162 110 146 100 Z"
BK_TEE = "M180 94 L222 94 L230 132 L208 184 L192 142 Z"
BK_LAP_L = "M156 92 L182 96 L198 170 L172 160 L158 124 Z"
BK_LAP_R = "M244 92 L222 96 L240 152 L268 160 L278 124 Z"
BK_ZIP_L = "M186 158 C190 236 195 320 200 398"
BK_ZIP_R = "M252 156 C244 236 224 320 206 398"
BELT = "M120 368 L280 368 L280 386 L120 386 Z"

def jacket_biker(p: Pen) -> str:
    """По фото 05 и кадру pg-011-018: варёный графит с «мраморной» варкой, распахнутый ворот (видно футболку),
    большие лацканы на кнопках, две молнии сходятся к подолу, капюшон за воротом, ремень с люверсами,
    хвост ремня висит по центру, пряжка — справа ниже подола, вертикальные карманы."""
    rng = random.Random(55)
    defs = radial_defs("ac", JK_HI, .5)
    wash = blobs("ac", scatter(rng, 24, (80, 50, 320, 390), (10, 26), (6, 16)))
    out = "" if p.mk else defs
    out += p.plate(BK_HOOD, "#2C2E32") + ("" if p.mk else p.clip(BK_HOOD, wash))
    out += p.seam("M200 28 L200 112", LIGHT, .25) + p.outline(BK_HOOD)
    out += p.plate(BK, JK_G) + ("" if p.mk else p.clip(BK, wash))
    out += p.seam("M118 250 C116 206 112 164 104 114 M282 250 C284 206 288 164 296 114 M72 352 L108 358 M292 358 L328 352 "
                  "M140 268 L146 330 M260 268 L254 330", LIGHT, .28)
    out += p.stitch("M120 360 L280 360 M74 360 L108 366 M292 366 L326 360", LIGHT, .3)
    out += p.plate(BK_TEE, "#ECEAE4") + p.seam("M180 98 C192 110 212 110 222 98", INK, .3) + p.outline(BK_TEE, 1)
    out += p.seam(BK_ZIP_R, "#000", .5, 1.2)
    if p.mk:
        out += p.seam(BK_ZIP_L + " " + BK_ZIP_R, INK, .9)
    else:
        for z in (BK_ZIP_L, BK_ZIP_R):
            out += st(ser(z, 1), 3.6, "#141518") + st(ser(z, 1), 2, METAL, 1, "1.4 1.1", "butt")
    out += p.plate(BK_LAP_L, JK_LAP) + p.outline(BK_LAP_L, 1.2) + p.plate(BK_LAP_R, JK_LAP) + p.outline(BK_LAP_R, 1.2)
    if not p.mk:
        out += "".join(f'<circle cx="{x}" cy="{y}" r="2.7" fill="{METAL}" stroke="#111" stroke-width=".5"/>'
                       for x, y in ((182, 154), (254, 152), (164, 104), (238, 102)))
    out += p.plate(BELT, "#2B2D31") + p.stitch("M122 371 L278 371 M122 383 L278 383", LIGHT, .3) + p.outline(BELT, 1.2)
    if not p.mk:
        out += "".join(f'<circle cx="{x}" cy="377" r="1.8" fill="none" stroke="{METAL}" stroke-width="1"/>' for x in range(132, 272, 14))
    # хвост ремня по центру и пряжка справа ниже подола (как на фото — висят)
    tab = "M170 382 L184 382 L186 420 L172 420 Z"
    out += p.plate(tab, "#2B2D31") + p.outline(tab, 1.1)
    if p.mk:
        out += p.outline("M262 394 L284 394 L284 416 L262 416 Z", 1.4)
    else:
        out += st("M268 386 C268 392 270 396 272 400", 5, "#2B2D31")
        out += (f'<rect x="262" y="396" width="22" height="20" rx="2" fill="none" stroke="#4A4946" stroke-width="3.6"/>'
                f'<rect x="262" y="396" width="22" height="20" rx="2" fill="none" stroke="{METAL}" stroke-width="1.8"/>'
                f'<path d="M273 396V416" stroke="#4A4946" stroke-width="2"/>')
    # косуха укороченная и широкая (как на фото): сжимаем по высоте к подолу
    return f'<g transform="translate(0 {400 * .16:.0f}) scale(1 .84)">{out + p.outline(BK)}</g>'

# ============================================================== 06 · ДЖИНСЫ КРАСНАЯ ЛИНИЯ (спина — так на фото)
INDIGO, INDIGO_HI, STITCH = "#18191F", "#2D3140", "#D0283A"
JR = ("M128 62 L272 62 L276 86 C290 206 306 330 318 448 L214 454 L200 196 L186 454 "
      "L82 448 C94 330 110 206 124 86 Z")

def jeans_redline(p: Pen) -> str:
    """По фото 06 (спина): тёмный деним почти в чёрный с синевой, красная строчка по ВСЕМ швам —
    пояс, кокетка, средний шов, карманы с крестом, боковые и шаговые, подгиб, косые бары у колена."""
    defs = (radial_defs("iw", INDIGO_HI, .8) +
            f'<linearGradient id="iv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{INDIGO}"/>'
            f'<stop offset=".45" stop-color="#1F2129"/><stop offset="1" stop-color="{INDIGO}"/></linearGradient>')
    wash = blobs("iw", [(150, 250, 26, 70, 4), (250, 250, 26, 70, -4), (140, 380, 22, 46, 6), (260, 380, 22, 46, -6)])
    out = p.plate(JR, INDIGO) if p.mk else defs + fl(ser(JR, 0), "url(#iv)") + p.clip(JR, wash)
    red = lambda d, w=1: p.stitch(d, STITCH, .95, w, "3.2 2.4")
    out += p.seam("M124 86 L276 86 M200 86 L200 196 M126 118 L200 134 L274 118", LIGHT, .22)
    out += red("M126 74 L274 74 M127 82 L273 82 M127 122 L200 138 L273 122 M197 88 L197 192 M203 88 L203 192")
    out += p.seam("M142 60 L142 86 M170 60 L170 86 M200 60 L200 86 M230 60 L230 86 M258 60 L258 86", LIGHT, .3)
    pk = "M138 146 L186 150 L184 200 L162 210 L140 198 Z M262 146 L214 150 L216 200 L238 210 L260 198 Z"
    out += p.seam(pk, "#000", .45)
    out += red("M142 152 L182 156 L180 197 L162 205 L144 195 Z M258 152 L218 156 L220 197 L238 205 L256 195 Z", .9)
    out += red("M144 160 L180 194 M180 162 L146 190 M256 160 L220 194 M220 162 L254 190", 1.1)
    out += red("M126 90 C112 210 98 330 86 444 M274 90 C288 210 302 330 314 444 M196 200 L183 448 M204 200 L217 448")
    out += red("M88 438 L184 444 M216 444 L312 438")
    bars = "".join(f"M{106 + i * 3} {300 + i * 22} l38 -8 " for i in range(3)) + "".join(f"M{294 - i * 3} {300 + i * 22} l-38 -8 " for i in range(3))
    out += red(bars, 1.1)
    out += '<rect x="232" y="64" width="26" height="15" fill="#0E0E10"/>' if not p.mk else p.outline("M232 64 L258 64 L258 79 L232 79 Z", 1)
    return out + p.outline(JR)

# ============================================================== 07 · ФУТБОЛКА ФОН, 08 · ЛОНГСЛИВ ФОН
TEE = ("M150 66 C170 82 230 82 250 66 L318 94 L344 172 L302 186 L290 150 L290 420 L110 420 "
       "L110 150 L98 186 L56 172 L82 94 Z")
LONG = ("M150 66 C170 82 230 82 250 66 L300 90 C318 180 330 300 336 404 L302 410 L288 170 L288 420 "
        "L112 420 L112 170 L98 410 L64 404 C70 300 82 180 100 90 Z")

def tee_blank(p: Pen) -> str:
    out = p.plate(TEE, "#FFFFFF")
    out += p.seam("M150 66 C170 94 230 94 250 66 M110 150 L82 94 M290 150 L318 94", INK, .3)
    out += p.stitch("M112 406 L288 406 M155 71 C172 89 228 89 245 71 M300 178 L306 166 M100 178 L94 166", INK, .4)
    out += jacquard(122, 386)
    return out + p.outline(TEE)

def longsleeve_blank(p: Pen) -> str:
    rib = "".join(f"M{66 + i * 4.2:.1f} {366 + i * .7:.1f} L{64 + i * 4.2:.1f} {406 + i * .7:.1f} " for i in range(9)) + \
          "".join(f"M{300 + i * 4.2:.1f} {371 - i * .7:.1f} L{302 + i * 4.2:.1f} {411 - i * .7:.1f} " for i in range(9))
    out = p.plate(LONG, "#FFFFFF")
    out += p.seam("M150 66 C170 94 230 94 250 66 M112 170 C110 148 106 118 100 92 M288 170 C290 148 294 118 300 92 "
                  "M67 364 L101 370 M299 370 L333 364", INK, .3)
    out += p.stitch("M114 406 L286 406 M155 71 C172 89 228 89 245 71", INK, .4)
    out += p.seam(rib, INK, .28, .8) if not p.mk else p.stitch("M66 380 L100 386 M300 386 L334 380", INK, .4)
    out += jacquard(124, 386)
    return out + p.outline(LONG)

# ============================================================== вещи: посадка, выноски, пометки, лупы
# hem — подол рисунка до посадки; half — полуширина тени; cat — масштаб; точки — в координатах рисунка.
# note = (текст, левый верх подписи в координатах ПЛИТКИ, цель стрелки в координатах РИСУНКА)
ITEMS = {
    "jeans-restart": dict(fn=jeans_restart, hem=452, cat="bottom", half=110, seed=7,
        callouts=[((158, 150), "RESTART. — столбиком, от руки"), ((172, 372), "стрелка и «Let it B» по штанине"),
                  ((300, 430), "широкая прямая, чёрный варёный")],
        note=("ignore\nthe signs", (304, 120), (182, 360)), loupe=(160, 150, 2.6), tag_from=(262, 66)),
    "suit-detour": dict(fn=suit_detour, hem=596, cat="suit", half=112, seed=8,
        callouts=[((92, 130), "дуги-вставки: беж, лес, олива"), ((300, 262), "резинка по низу и на манжетах"),
                  ((150, 470), "брюки комплектом, лампас-дуга")],
        note=("в объезд", (300, 96), (292, 134)), loupe=(290, 136, 2.4), tag_from=(236, -24)),
    "jeans-scribble": dict(fn=jeans_scribble, hem=454, cat="bottom", half=114, seed=9,
        callouts=[((150, 200), "каракули — вышивка нитью"), ((250, 330), "варка: двух одинаковых пар нет"),
                  ((300, 440), "широкий, объём по бедру")],
        note=("вышивка,\nне маркер", (300, 120), (262, 250)), loupe=(160, 220, 2.8), tag_from=(260, 64)),
    "hoodie-crack": dict(fn=hoodie_crack, hem=400, cat="top", half=136, seed=10,
        callouts=[((178, 240), "трещины — принт по всей спине"), ((250, 200), "вафельное полотно, распыление"),
                  ((92, 200), "чёрная вставка, спущенное плечо")],
        note=("трещины", (300, 150), (268, 240)), loupe=(196, 250, 2.8), tag_from=(240, 150)),
    "jacket-biker": dict(fn=jacket_biker, hem=400, cat="top", half=128, seed=11,
        callouts=[((200, 96), "капюшон пришит"), ((226, 316), "две молнии, кнопки на лацканах"),
                  ((273, 404), "ремень с металлической пряжкой")],
        note=("ремень\nс пряжкой", (300, 230), (270, 398)), loupe=(244, 196, 2.6), tag_from=(206, 158)),
    "jeans-redline": dict(fn=jeans_redline, hem=454, cat="bottom", half=118, seed=12,
        callouts=[((162, 178), "крест строчкой на карманах"), ((300, 300), "красная строчка по всем швам"),
                  ((124, 300), "бары у колена")],
        note=("за линию —\nможно", (300, 128), (278, 214)), loupe=(162, 176, 2.6), tag_from=(258, 64)),
    "tee-blank": dict(fn=tee_blank, hem=420, cat="top", half=112, seed=13,
        callouts=[((130, 394), "жаккардовая G у подола"), ((200, 80), "рибана на горловине"),
                  ((300, 300), "плотный хлопок, свободный крой")],
        note=("только G", (286, 286), (138, 392)), loupe=(130, 393, 3.4), tag_from=(232, 74)),
    "longsleeve-blank": dict(fn=longsleeve_blank, hem=420, cat="top", half=124, seed=14,
        callouts=[((318, 390), "длинная манжета в рубчик"), ((132, 394), "жаккардовая G у подола"),
                  ((200, 80), "плотный хлопок")],
        note=("манжета\nв рубчик", (300, 236), (320, 390)), loupe=(131, 393, 3.2), tag_from=(232, 74)),
}

class Placed:
    def __init__(self, pid: str, s_mul: float = 1, cx: float = 200, floor: float = FLOOR):
        it = ITEMS[pid]; self.it = it; self.hem = it["hem"]; self.s = SCALE[it["cat"]] * s_mul; self.cx = cx; self.floor = floor
    def pt(self, x: float, y: float) -> tuple[float, float]:
        return self.cx + (x - 200) * self.s, self.floor + (y - self.hem) * self.s
    def tr(self) -> str:
        return f"translate({self.cx:g} {self.floor:g}) scale({self.s:.4g}) translate(-200 {-self.hem})"

def shadow(pl: Placed) -> str:
    return ('<radialGradient id="sh"><stop offset="0" stop-color="#000" stop-opacity=".16"/>'
            '<stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>'
            f'<ellipse cx="{pl.cx:g}" cy="{pl.floor + 3:g}" rx="{pl.it["half"] * pl.s:.0f}" ry="{7 * pl.s / .88:.1f}" fill="url(#sh)"/>')

def svg(body: str, vb: str = f"0 0 {W} {H}", size: bool = True) -> str:
    wh = ' width="800" height="1000"' if size else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="{vb}"{wh}>'
            + body + "</svg>")

def art_group(pid: str, mode: str, pl: Placed) -> str:
    it = ITEMS[pid]
    return f'<g id="art" transform="{pl.tr()}">{it["fn"](Pen(mode, it["seed"]))}</g>'

def loupe_svg(cx: float, cy: float, z: float, lx: float, ly: float, r: float) -> str:
    """Лупа: та же вещь (<use href=#art>) в z раз, вырезанная кругом; пунктир на месте детали и тонкая связка."""
    dist = math.dist((cx, cy), (lx, ly)) or 1; rr = r / z
    ux, uy = (lx - cx) / dist, (ly - cy) / dist
    link = f"M{cx + ux * rr:.1f} {cy + uy * rr:.1f}L{lx - ux * r:.1f} {ly - uy * r:.1f}"
    return (f'<clipPath id="lz"><circle cx="{lx:g}" cy="{ly:g}" r="{r:g}"/></clipPath>'
            f'<circle cx="{lx:g}" cy="{ly:g}" r="{r + 5:g}" fill="{PAPER}"/>'
            f'<g clip-path="url(#lz)"><rect x="{lx - r:g}" y="{ly - r:g}" width="{2 * r:g}" height="{2 * r:g}" fill="{PAPER}"/>'
            f'<use href="#art" xlink:href="#art" transform="translate({lx:g} {ly:g}) scale({z:.3g}) translate({-cx:.1f} {-cy:.1f})"/></g>'
            f'<circle cx="{lx:g}" cy="{ly:g}" r="{r:g}" fill="none" stroke="{INK}" stroke-width="1.3"/>'
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{rr:.1f}" fill="none" stroke="{INK}" stroke-width=".9" stroke-dasharray="2 2"/>'
            + st(link, .8, INK))

# ---------- пометка от руки: буквы → отдельный SVG (обрезан по буквам), стрелка → данные для JS
def note_assets(pid: str, pl: Placed) -> dict:
    text, (tx, ty), target = ITEMS[pid]["note"]
    subs = []
    a = math.radians(-4)
    for li, line in enumerate(text.split("\n")):
        s, w = glyphs(line, "hand", 19, .3)
        subs += xform(s, math.cos(a), math.sin(a), -math.sin(a), math.cos(a), tx + li * 7, ty + 16 + li * 21)
    x0, y0, x1, y1 = bbox(subs); pad = 2.5
    if x1 + pad > W - 8:                              # не вылезать за край плитки
        sh = x1 + pad - (W - 8); subs = xform(subs, 1, 0, 0, 1, -sh, 0); x0 -= sh; x1 -= sh
    x0, y0, x1, y1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
    d = ser(xform(subs, 1, 0, 0, 1, -x0, -y0), 1, .5)
    body = f'<path d="{d}" fill="{INK}" stroke="{PAPER}" stroke-width="3.4" stroke-linejoin="round" paint-order="stroke"/>'
    (ART / f"{pid}-n.svg").write_text(svg(body, f"0 0 {x1 - x0:.1f} {y1 - y0:.1f}", False), encoding="utf-8")
    rng = random.Random(len(pid) * 7 + 1)
    px, py = pl.pt(*target)
    if py > y1:      # деталь ниже подписи: из-под подписи вниз-влево, дугой
        a0 = (x0 + (x1 - x0) * .38, y1 + 2)
        c1 = (a0[0] - 4, a0[1] + max(26, (py - a0[1]) * .5)); c2 = (px + (a0[0] - px) * .35, py + 14)
    else:            # деталь левее/выше: от левого края подписи
        a0 = (x0 - 3, y0 + (y1 - y0) * .6)
        c1 = (a0[0] - 26, a0[1] + 10); c2 = (px + 24, py + 18)
    rd = rough(f"M{a0[0]:.1f} {a0[1]:.1f}C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {px:.1f} {py:.1f}", rng, .6, 0, 6)
    ang = math.atan2(py - c2[1], px - c2[0])
    hx = [(px - 11 * math.cos(ang + s_), py - 11 * math.sin(ang + s_)) for s_ in (.5, -.5)]
    return {"x": round(x0, 1), "y": round(y0, 1), "w": round(x1 - x0, 1), "h": round(y1 - y0, 1),
            "arrow": ser(rd, 0),
            "tip": f"M{hx[0][0]:.0f} {hx[0][1]:.0f}L{px:.0f} {py:.0f}L{hx[1][0]:.0f} {hx[1][1]:.0f}",
            "text": text.replace("\n", " ")}

# ---------- навесная бирка с новым лого (вертикально, снизу вверх)
TAG_W, TAG_H = 40, 112
def tag_svg() -> None:
    src = (LOGO / "logo_p1.svg").read_text()
    subs: list[dict] = []
    for d in re.findall(r'<path[^>]*?d="([^"]+)"', src): subs += parse(d)
    x0, y0, x1, y1 = bbox(subs)
    k = (TAG_H - 30) / (x1 - x0); lh = (y1 - y0) * k
    m = xform(subs, 1, 0, 0, 1, -x0, -y0)
    m = xform(m, 0, -k, k, 0, (TAG_W - lh) / 2, TAG_H - 8)      # rotate(-90)
    body = (f'<path d="M3 0H{TAG_W - 3}l3 3V{TAG_H - 3}l-3 3H3l-3-3V3z" fill="#111"/>'
            f'<circle cx="{TAG_W / 2:g}" cy="9" r="3.2" fill="{PAPER}"/>'
            f'<path d="{ser(m, 1, .5)}" fill="#fff"/>')
    (ART / "tag.svg").write_text(svg(body, f"0 0 {TAG_W} {TAG_H}", False), encoding="utf-8")

# ============================================================== сборка файлов
TAG_AT = (334, 286, 6)        # бирка в стиле c: левый верх (x, y) в координатах плитки и наклон

def build() -> dict:
    data: dict = {}
    tag_svg()
    for pid, it in ITEMS.items():
        pl = Placed(pid)
        (HERE / f"{pid}-1.svg").write_text(svg(shadow(pl) + art_group(pid, "clean", pl)), encoding="utf-8")
        (ART / f"{pid}-b.svg").write_text(svg(shadow(pl) + art_group(pid, "marker", pl)), encoding="utf-8")
        # c · вещь меньше и левее + лупа справа вверху + нитка к бирке
        pc = Placed(pid, .8, 160, 440)
        cx, cy = pc.pt(*it["loupe"][:2])
        tfx, tfy = pc.pt(*it["tag_from"])
        hx, hy = TAG_AT[0] + TAG_W / 2 - 1, TAG_AT[1] + 9
        string = st(f"M{tfx:.0f} {tfy:.0f}C{tfx + 30:.0f} {tfy + 20:.0f} {hx - 26:.0f} {hy - 40:.0f} {hx:.0f} {hy:.0f}", .8, INK, .8)
        c_body = shadow(pc) + art_group(pid, "clean", pc) + string + loupe_svg(cx, cy, it["loupe"][2], 314, 132, 64)
        (ART / f"{pid}-c.svg").write_text(svg(c_body), encoding="utf-8")
        # 2 · деталь крупно: большая лупа + маленькая вещь с пунктиром на детали
        ps = Placed(pid, .42, 92, 472)
        dx, dy = ps.pt(*it["loupe"][:2])
        z2 = SCALE[it["cat"]] * it["loupe"][2] * 1.25 / ps.s
        (HERE / f"{pid}-2.svg").write_text(svg(shadow(ps) + art_group(pid, "clean", ps) + loupe_svg(dx, dy, z2, 236, 208, 148)),
                                           encoding="utf-8")
        data[pid] = {"callouts": [[round(v) for v in pl.pt(*p_)] + [t] for p_, t in it["callouts"]],
                     "note": note_assets(pid, pl),
                     "loupe": [round(v) for v in pc.pt(*it["loupe"][:2])]}
    return data

def write_js(data: dict) -> None:
    for pid in data:
        data[pid]["src"] = {"flat": f"{{{{asset:img/{pid}-1.svg}}}}", "b": f"{{{{asset:img/art/{pid}-b.svg}}}}",
                            "c": f"{{{{asset:img/art/{pid}-c.svg}}}}", "detail": f"{{{{asset:img/{pid}-2.svg}}}}",
                            "note": f"{{{{asset:img/art/{pid}-n.svg}}}}"}
    block = ("/*<gen> — пишет src/img/_gen.py, руками не править */\n"
             "var DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
             f'var TAG = {{src:"{{{{asset:img/art/tag.svg}}}}", x:{TAG_AT[0]}, y:{TAG_AT[1]}, r:{TAG_AT[2]}, w:{TAG_W}, h:{TAG_H}}};\n'
             "/*</gen>*/")
    src = JS.read_text(encoding="utf-8")
    if "/*<gen>" in src:
        JS.write_text(re.sub(r"/\*<gen>.*?/\*</gen>\*/", lambda m: block, src, flags=re.S), encoding="utf-8")
    else:
        print("cards-art.js: нет блока /*<gen>*/ — данные не записаны")

if __name__ == "__main__":
    write_js(build())
    tot = 0; worst = (0, "")
    for f in sorted(list(HERE.glob("*-[12].svg")) + list(ART.glob("*.svg"))):
        n = f.stat().st_size; tot += n; worst = max(worst, (n, f.name))
        print(f"{f.relative_to(HERE)}  {n / 1024:.1f} КБ")
    print(f"всего {tot / 1024:.0f} КБ, самый тяжёлый {worst[1]} {worst[0] / 1024:.1f} КБ")
