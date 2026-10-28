#!/usr/bin/env python3
"""Сборка src/index.html → dist/grinchin.html (один самодостаточный файл).

Маркеры в index.html (и во вложенных .html-частях):
  <!--@css:file.css-->   → <style>…</style>
  <!--@js:file.js-->     → <script>…</script>
  <!--@html:file.html--> → содержимое части (маркеры внутри тоже раскрываются)
  <!--@svg:name-->       → содержимое src/svg/name.svg
  {{img:path}}           → data:URI файла из src/ (jpg/png/avif/webp/svg) — для мелочи (иконки, фактуры ≤ ~20 КБ)
  {{asset:path}}         → файл копируется в dist/assets/, подставляется относительный URL —
                           для фото и крупных фактур (грузятся отдельно, лениво, не раздувают HTML)
Всё, что не найдено, — ошибка сборки (не тихий пропуск).

Параметры (v5, 29.10.2026):
  --light=cold|warm  свет hero (по умолчанию cold). warm подставляет тёплые кадры и данные рта/геометрии
                     (img/v5/hero-warm/, hero5-data-warm.json, hero5-vars-warm.css — готовит v5/hero5/tools/make_hero.py
                     --light warm) и ставит <html data-light="warm">: по нему hero5.css/loader/hero5.js красят все световые
                     эффекты (вспышки лампы, конус, пере-свет, «свет гаснет») в янтарь. cold — холодный белый.
  --out=папка        куда собирать (по умолчанию dist/): <папка>/grinchin.html + <папка>/assets/.
Две версии одной командой: python3 build.py --light=cold --out dist-cold && python3 build.py --light=warm --out dist-warm
"""
from __future__ import annotations
import base64, mimetypes, re, sys, pathlib, shutil

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
ARGS = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--") and "=" in a)
LIGHT = ARGS.get("light", "cold")
if LIGHT not in ("cold", "warm"):
    sys.exit(f"build: --light={LIGHT}? ожидается cold|warm")
OUT = pathlib.Path(ARGS.get("out", ROOT / "dist")).resolve() / "grinchin.html"
# подмены для тёплой версии: тот же src, другие кадры hero и их данные (имена файлов — make_hero.py --light warm)
SWAP = {} if LIGHT == "cold" else {"hero5-data.json": "hero5-data-warm.json", "hero5-vars.css": "hero5-vars-warm.css",
                                   "img/v5/hero/": "img/v5/hero-warm/"}
def swap(rel: str) -> str:
    for a, b in SWAP.items():
        if rel == a or (a.endswith("/") and rel.startswith(a)):
            return b + rel[len(a):] if a.endswith("/") else b
    return rel
MIME = {".avif": "image/avif", ".webp": "image/webp", ".svg": "image/svg+xml",
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}

def read(rel: str) -> str:
    p = SRC / swap(rel)
    if not p.exists():
        sys.exit(f"build: нет файла {p}")
    return p.read_text(encoding="utf-8")

def expand(text: str, depth: int = 0) -> str:
    if depth > 6:
        sys.exit("build: слишком глубокая вложенность @html")
    text = re.sub(r"<!--@html:([^>]+?)-->", lambda m: expand(read(m.group(1).strip()), depth + 1), text)
    text = re.sub(r"<!--@css:([^>]+?)-->", lambda m: "<style>\n" + read(m.group(1).strip()) + "\n</style>", text)
    # </script внутри JS ломает инлайн — экранируем
    text = re.sub(r"<!--@js:([^>]+?)-->",
                  lambda m: "<script>\n" + read(m.group(1).strip()).replace("</script", "<\\/script") + "\n</script>", text)
    text = re.sub(r"<!--@svg:([^>]+?)-->", lambda m: read("svg/" + m.group(1).strip() + ".svg").strip(), text)
    def img(m: re.Match) -> str:
        p = SRC / m.group(1).strip()
        if not p.exists():
            sys.exit(f"build: нет картинки {p}")
        mime = MIME.get(p.suffix.lower()) or mimetypes.guess_type(p.name)[0]
        return f"data:{mime};base64," + base64.b64encode(p.read_bytes()).decode()
    text = re.sub(r"\{\{img:([^}]+)\}\}", img, text)
    def asset(m: re.Match) -> str:
        rel = swap(m.group(1).strip())
        p = SRC / rel
        if not p.exists():
            sys.exit(f"build: нет ассета {p}")
        dst = OUT.parent / "assets" / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(p, dst)
        return "assets/" + rel
    return re.sub(r"\{\{asset:([^}]+)\}\}", asset, text)

shutil.rmtree(OUT.parent / "assets", ignore_errors=True)
html = expand(read("index.html"))
# свет версии — на <html> до первой отрисовки (CSS/JS заставки и hero читают html[data-light])
html, n = re.subn(r"<html lang=\"ru\">", f'<html lang="ru" data-light="{LIGHT}">', html, count=1)
if not n:
    sys.exit("build: не нашёл <html lang=\"ru\"> для data-light")
left = re.findall(r"<!--@\w+:[^>]*-->|\{\{(?:img|asset):[^}]*\}\}", html)
if left:
    sys.exit(f"build: не раскрыто: {left[:5]}")
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(html, encoding="utf-8")
# src/meta целиком: иконки из манифеста адресуются относительно него и в разметке не упоминаются
meta_dst = OUT.parent / "assets" / "meta"
meta_dst.mkdir(parents=True, exist_ok=True)
for f in (SRC / "meta").glob("*"):
    if f.is_file() and f.name != "head.html":
        shutil.copyfile(f, meta_dst / f.name)
kb = OUT.stat().st_size / 1024
print(f"build: {OUT} — {kb:.0f} КБ, свет {LIGHT}")
