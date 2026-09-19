#!/bin/sh
# Regenerate the README screenshots with headless Chrome against a local server.
# Your own programs (js/local.js) are set aside while shooting so the pictures
# show only what the repo ships.
#   python3 -m http.server 8777 &   then   tools/screenshots.sh [preset-id]
cd "$(dirname "$0")/.." || exit 1
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PRESET="${1:-starter-prepre}"
BASE="http://localhost:8777/index.html"
mkdir -p docs/img
[ -f js/local.js ] && mv js/local.js js/local.js.aside
shot() { "$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=1440,900 --virtual-time-budget=5000 --screenshot="docs/img/$1.png" "$BASE?$2" 2>/dev/null; echo "docs/img/$1.png"; }
shot follow    "preset=$PRESET&t=30&cam=follow"
shot overhead  "preset=$PRESET&t=70&cam=overhead"
shot judge     "preset=$PRESET&t=52&cam=judge"
# the analysis tab and the gallery build heavier DOM; give them a real timeout instead of virtual time
shotq() { timeout 60 "$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=1440,900 --timeout=8000 --screenshot="docs/img/$1.png" "$BASE?$2" 2>/dev/null; echo "docs/img/$1.png"; }
shotq analysis "preset=$PRESET&t=30&cam=overhead&tab=anal"
shotq gallery  "preset=$PRESET&gallery=1"
[ -f js/local.js.aside ] && mv js/local.js.aside js/local.js
