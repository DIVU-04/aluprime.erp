#!/usr/bin/env bash
# Build a ready-to-upload ZIP of the static site for Hostinger (or any host).
# Usage:  bash scripts/build-zip.sh
# Output: dist/kb-garage-site.zip  (upload its contents into public_html)
set -euo pipefail

cd "$(dirname "$0")/.."
OUT_DIR="dist"
ZIP="$OUT_DIR/kb-garage-site.zip"

mkdir -p "$OUT_DIR"
rm -f "$ZIP"

# Only the files needed to serve the site.
zip -r "$ZIP" \
  index.html \
  robots.txt \
  sitemap.xml \
  .htaccess \
  assets \
  >/dev/null

echo "Created $ZIP"
unzip -l "$ZIP"
