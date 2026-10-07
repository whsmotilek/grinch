#!/usr/bin/env python3
"""Генерация фавиконов, иконок PWA и превью для ссылок из векторов бренда.

Источник знака — src/svg/g-horns.svg (G в рогах, оригинальный вектор из PDF, pres_14),
улыбка — src/svg/smile.svg. Растеризация — headless Chrome (других растеризаторов на машине нет).
Запуск: python3 tools/make_icons.py  → файлы в src/meta/.
"""
from __future__ import annotations
import base64, pathlib, re, struct, subprocess, tempfile, time, shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, META = ROOT / "src", ROOT / "src" / "meta"
CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BLACK, GREEN, ACID = "#000000", "#00DB24", "#00FF2A"   # tokens.css / pres_07

def inner(svg: str) -> tuple[str, str]:
    vb = re.search(r'viewBox="([^"]+)"', svg).group(1)
    body = re.sub(r"^<svg[^>]*>|</svg>\s*$", "", svg.strip(), flags=re.S)
    return vb, body

gvb, gbody = inner((SRC / "svg/g-horns.svg").read_text())
svb, sbody = inner((SRC / "svg/smile.svg").read_text())
gx, gy, gw, gh = map(float, gvb.split())

def mark_svg(size: int = 512, pad: float = .14, radius: float = .0, bg: str = BLACK, fg: str = GREEN,
             sad: bool = False) -> str:
    """Квадратная плашка (как жаккардовая бирка pres_14) с G в рогах по центру."""
    inner_w = size * (1 - 2 * pad)
    s = inner_w / max(gw, gh)
    tx = (size - gw * s) / 2 - gx * s
    ty = (size - gh * s) / 2 - gy * s
    if sad:  # «вернись»: знак переворачивается рогами вниз — грустная ухмылка
        g = f'<g transform="translate({size} {size}) rotate(180) translate({tx:.2f} {ty:.2f}) scale({s:.4f})" fill="{fg}">{gbody}</g>'
    else:
        g = f'<g transform="translate({tx:.2f} {ty:.2f}) scale({s:.4f})" fill="{fg}">{gbody}</g>'
    r = size * radius
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">'
            f'<rect width="{size}" height="{size}" rx="{r:.1f}" fill="{bg}"/>{g}</svg>')

def render(html: str, w: int, h: int, out: pathlib.Path, transparent: bool = False) -> None:
    tmp = pathlib.Path(tempfile.mkdtemp())
    page = tmp / "p.html"
    page.write_text(f'<!doctype html><html><head><meta charset="utf-8"><style>html,body{{margin:0;width:{w}px;height:{h}px;overflow:hidden;background:{"transparent" if transparent else "#000"}}}</style></head><body>{html}</body></html>', encoding="utf-8")
    args = [CH, "--headless=new", "--no-sandbox", "--hide-scrollbars", f"--user-data-dir={tmp/'prof'}",
            f"--window-size={w},{h}", "--force-device-scale-factor=1", "--force-color-profile=srgb", f"--screenshot={out}", page.as_uri()]
    if transparent:
        args.insert(3, "--default-background-color=00000000")
    p = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(80):
        if out.exists() and out.stat().st_size > 0:
            time.sleep(.5); break
        time.sleep(.25)
    p.kill(); subprocess.run(["pkill", "-f", str(tmp / "prof")], stderr=subprocess.DEVNULL)
    shutil.rmtree(tmp, ignore_errors=True)
    if not out.exists():
        raise SystemExit(f"не отрендерилось: {out}")

def png(svg: str, size: int, out: pathlib.Path) -> None:
    # окно headless не бывает уже ~500 px — рендерим крупно и уменьшаем sips'ом
    big = max(size, 512)
    tmp = out.with_suffix(".big.png")
    render(svg.replace(f'width="{512}" height="{512}"', f'width="{big}" height="{big}"'), big, big, tmp)
    subprocess.run(["sips", "-z", str(size), str(size), str(tmp), "--out", str(out)], stdout=subprocess.DEVNULL, check=True)
    tmp.unlink()

def ico(pngs: list[pathlib.Path], out: pathlib.Path) -> None:
    """ICO с PNG внутри (поддерживается всеми браузерами с Vista+)."""
    datas = [p.read_bytes() for p in pngs]
    sizes = [struct.unpack(">II", d[16:24]) for d in datas]
    head = struct.pack("<HHH", 0, 1, len(datas))
    off = 6 + 16 * len(datas)
    dirs = b""
    for (w, h), d in zip(sizes, datas):
        dirs += struct.pack("<BBBBHHII", w % 256, h % 256, 0, 0, 1, 32, len(d), off)
        off += len(d)
    out.write_bytes(head + dirs + b"".join(datas))

META.mkdir(parents=True, exist_ok=True)
# SVG-фавиконы: обычный и «грустный» (вкладка неактивна)
(META / "favicon.svg").write_text(mark_svg(64, pad=.1, radius=.0), encoding="utf-8")
(META / "favicon-sad.svg").write_text(mark_svg(64, pad=.1, radius=.0, sad=True, fg=ACID), encoding="utf-8")
base = mark_svg(512, pad=.1)
for s in (16, 32, 48):
    png(base, s, META / f"fav-{s}.png")
ico([META / f"fav-{s}.png" for s in (16, 32, 48)], META / "favicon.ico")
for s in (16, 48):
    (META / f"fav-{s}.png").unlink()
(META / "fav-32.png").rename(META / "favicon-32.png")
png(mark_svg(512, pad=.16), 180, META / "apple-touch-icon.png")
png(mark_svg(512, pad=.14), 192, META / "icon-192.png")
png(mark_svg(512, pad=.14), 512, META / "icon-512.png")
png(mark_svg(512, pad=.24), 512, META / "icon-maskable-512.png")  # безопасная зона Android ~80 %

# Превью для ссылок 1200×630: дверь со скотчем GRINCHIN (pres_21) + полоса статуса
door = ROOT.parent / "assets/brand_raster/new/pg-021-090.jpg"
door_b64 = base64.b64encode(door.read_bytes()).decode()
lvb, lbody = inner((SRC / "svg/logo.svg").read_text())
og = f'''<div style="position:relative;width:1200px;height:630px;overflow:hidden;background:#000;font-family:'Martian Mono',Menlo,monospace">
<img src="data:image/jpeg;base64,{door_b64}" style="position:absolute;inset:0;width:1200px;height:630px;object-fit:cover;object-position:50% 45%;filter:contrast(1.08) saturate(1.05) brightness(.82)">
<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.0) 45%,rgba(0,0,0,.78) 100%)"></div>
<div style="position:absolute;left:0;right:0;top:0;height:44px;background:{GREEN};color:#000;font-size:20px;font-weight:700;letter-spacing:.12em;display:flex;align-items:center;justify-content:center">ДРОП 01 · ПРЕДЗАКАЗ ОТКРЫТ</div>
<svg viewBox="{gvb}" style="position:absolute;left:56px;bottom:50px;width:118px;color:{GREEN}" fill="currentColor">{gbody}</svg>
<div style="position:absolute;left:196px;bottom:56px;color:#fff;font-size:24px;letter-spacing:.05em;line-height:1.45">одежда для тех, кто<br>не идёт по заданному маршруту</div>
</div>'''
fonts = '<link href="https://fonts.googleapis.com/css2?family=Martian+Mono:wght@400;700&display=swap" rel="stylesheet">'
render(fonts + og, 1200, 630, META / "og.png")
subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "82", str(META / "og.png"), "--out", str(META / "og.jpg")],
               stdout=subprocess.DEVNULL, check=True)
(META / "og.png").unlink()
print("готово:", ", ".join(sorted(p.name for p in META.iterdir())))
