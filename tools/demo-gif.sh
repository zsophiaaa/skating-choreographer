#!/bin/sh
# Make docs/img/demo.gif: the app playing a program, shot frame by frame with
# headless Chrome through the deep link (?preset&t&cam) and assembled by ffmpeg.
#   python3 -m http.server 8777 &   then   tools/demo-gif.sh [preset] [t0] [seconds] [cam]
cd "$(dirname "$0")/.." || exit 1
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PRESET="${1:-starter-prepre}"; T0="${2:-24}"; LEN="${3:-8}"; CAM="${4:-follow}"
FPS=8; W=1280; H=800
TMP=$(mktemp -d); mkdir -p docs/img
[ -f js/local.js ] && mv js/local.js js/local.js.aside
n=$(( LEN * FPS )); i=0
while [ $i -lt $n ]; do
  t=$(python3 -c "print(round($T0 + $i / $FPS, 3))")
  timeout 40 "$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=$W,$H --timeout=2500 \
    --screenshot="$TMP/$(printf 'f%04d.png' $i)" "http://localhost:8777/index.html?preset=$PRESET&t=$t&cam=$CAM" 2>/dev/null
  i=$(( i + 1 ))
done
[ -f js/local.js.aside ] && mv js/local.js.aside js/local.js
ffmpeg -y -loglevel error -framerate $FPS -i "$TMP/f%04d.png" \
  -vf "scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" \
  -loop 0 docs/img/demo.gif
rm -rf "$TMP"; ls -la docs/img/demo.gif
