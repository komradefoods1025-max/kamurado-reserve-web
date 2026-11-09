#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /path/to/video.mp4" >&2
  echo "Copies into public/store-order/okonomiyaki.mp4 for the menu page." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$1"
DEST="$ROOT/public/store-order/okonomiyaki.mp4"

if [[ ! -f "$SRC" ]]; then
  echo "File not found: $SRC" >&2
  exit 1
fi

mkdir -p "$(dirname "$DEST")"
cp "$SRC" "$DEST"
echo "Installed: public/store-order/okonomiyaki.mp4"
echo "Next: git add public/store-order/okonomiyaki.mp4 && commit && push"
