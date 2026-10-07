#!/usr/bin/env python3
"""Сборка src/index.html → dist/grinchin.html (один самодостаточный файл).

Маркеры в index.html (и во вложенных .html-частях):
  <!--@css:file.css-->   → <style>…</style>
  <!--@js:file.js-->     → <script>…</script>
  <!--@html:file.html--> → содержимое части (маркеры внутри тоже раскрываются)
  <!--@svg:name-->       → содержимое src/svg/name.svg
  {{img:path}}           → data:URI файла из src/ (jpg/png/avif/webp/svg)
Всё, что не найдено, — ошибка сборки (не тихий пропуск).
"""
from __future__ import annotations
import base64, mimetypes, re, sys, pathlib

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
OUT = ROOT / "dist" / "grinchin.html"
MIME = {".avif": "image/avif", ".webp": "image/webp", ".svg": "image/svg+xml",
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}

def read(rel: str) -> str:
    p = SRC / rel
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
    return re.sub(r"\{\{img:([^}]+)\}\}", img, text)

html = expand(read("index.html"))
left = re.findall(r"<!--@\w+:[^>]*-->|\{\{img:[^}]*\}\}", html)
if left:
    sys.exit(f"build: не раскрыто: {left[:5]}")
OUT.write_text(html, encoding="utf-8")
kb = OUT.stat().st_size / 1024
print(f"build: {OUT} — {kb:.0f} КБ")
