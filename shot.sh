#!/bin/bash
# Скриншоты собранного сайта (headless Chrome), с таймаутом — Chrome иногда не выходит сам.
#   desktop      1440x900 первый экран
#   mobile       390x844  первый экран (через iframe: headless не даёт окно уже ~500px)
#   desktopfull  1440x7200
#   mobilefull   390x8000 (0–8000) + mobilefull2 (8000–16000)
# ?shot=1 — сайт сразу в конечном состоянии. Использование: ./shot.sh [имя] [доп.query, напр. "&open=cart"]
cd "$(dirname "$0")"
NAME=${1:-page}; Q=${2:-}
python3 build.py || exit 1
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PAGE="file://$PWD/dist/grinchin.html?shot=1$Q"
TMP=$(mktemp -d)

snap() { # $1 url  $2 WxH  $3 out.png
  local prof; prof=$(mktemp -d)
  "$CH" --headless=new --no-sandbox --hide-scrollbars --use-angle=swiftshader --enable-unsafe-swiftshader \
    --user-data-dir="$prof" --window-size="$2" --virtual-time-budget=6000 \
    --screenshot="$3" "$1" >/dev/null 2>&1 &
  local pid=$! t=0
  while kill -0 $pid 2>/dev/null && [ $t -lt 200 ]; do
    [ -s "$3" ] && { /bin/sleep 1; break; }
    /bin/sleep 0.5; t=$((t+1))
  done
  pkill -f "user-data-dir=$prof" 2>/dev/null; kill $pid 2>/dev/null
  rm -rf "$prof"
}

mob() { # $1 height  $2 out.png  [$3 сдвиг вниз] — страница в iframe 390px, потом обрезка до 390
  # headless не снимает поверхность выше ~8000px, поэтому длинную страницу снимаем кусками по 8000
  local h=$1 out=$2 off=${3:-0} wrap="$TMP/m$h-$off.html" ih=$(( $1 + ${3:-0} ))
  printf '<!doctype html><html><body style="margin:0;background:#000"><div style="height:%spx;overflow:hidden;margin-left:55px;width:390px"><iframe src="%s" style="border:0;width:390px;height:%spx;display:block;margin-top:-%spx"></iframe></div></body></html>' "$h" "$PAGE" "$ih" "$off" > "$wrap"
  snap "file://$wrap" "500,$h" "$TMP/raw.png"
  [ -s "$TMP/raw.png" ] && sips -c "$h" 390 "$TMP/raw.png" --out "$out" >/dev/null 2>&1
  rm -f "$TMP/raw.png"
}

snap "$PAGE" "1440,900"  "shots/${NAME}_desktop.png"
snap "$PAGE" "1440,7200" "shots/${NAME}_desktopfull.png"
mob 844   "shots/${NAME}_mobile.png"
mob 8000 "shots/${NAME}_mobilefull.png" 0
mob 8000 "shots/${NAME}_mobilefull2.png" 8000
rm -rf "$TMP"
for f in desktop mobile desktopfull mobilefull mobilefull2; do
  [ -s "shots/${NAME}_$f.png" ] && echo "shots/${NAME}_$f.png" || echo "НЕ СНЯТО: ${NAME}_$f"
done
