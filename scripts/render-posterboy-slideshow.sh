#!/usr/bin/env bash
set -euo pipefail

ENTRY="src/remotion/posterboy-slideshow/index.ts"
OUT="public/remotion/exports"
mkdir -p "$OUT"

render_one() {
  local id="$1"
  local base="$2"
  echo "→ Rendering $id (mp4)"
  npx remotion render "$ENTRY" "$id" "$OUT/${base}.mp4" \
    --codec=h264 --crf=28 --pixel-format=yuv420p --scale=0.75 --overwrite
  echo "→ Rendering $id (webm)"
  npx remotion render "$ENTRY" "$id" "$OUT/${base}.webm" \
    --codec=vp8 --crf=32 --scale=0.75 --overwrite
  echo "→ Still $id (poster)"
  npx remotion still "$ENTRY" "$id" "$OUT/${base}-poster.png" \
    --frame=220 --scale=0.75 --overwrite
}

render_one "BulkUpload" "bulk-upload"
render_one "CreatorStudio" "creator-studio"
render_one "AutoCaption" "auto-caption"

echo "→ Combined slideshow mp4"
npx remotion render "$ENTRY" "PosterboySlideshow" "$OUT/posterboy-slideshow.mp4" \
  --codec=h264 --crf=28 --pixel-format=yuv420p --scale=0.75 --overwrite

ls -lah "$OUT"
echo "Done."
