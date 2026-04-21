#!/bin/bash
set -e

echo "[capacitor-build] Temporarily excluding server-only routes..."

# Move server-only routes outside app/ for Capacitor static export
# These routes require a Node.js server and don't apply to the mobile app
BACKUP_DIR=/tmp/cap-routes-backup
mkdir -p "$BACKUP_DIR"

for dir in app/api app/google51eb14e27f908175.html app/robots.txt app/sitemap-index.xml app/sitemap.xml; do
  if [ -d "$dir" ]; then
    mv "$dir" "$BACKUP_DIR/"
    echo "[capacitor-build] Moved $dir to backup"
  fi
done

echo "[capacitor-build] Running Next.js static export..."
BUILD_TARGET=capacitor npx next build

echo "[capacitor-build] Restoring server-only routes..."
for item in "$BACKUP_DIR"/*; do
  if [ -e "$item" ]; then
    name=$(basename "$item")
    # Determine destination (api goes back into app/)
    if [ "$name" = "api" ]; then
      mv "$item" app/
    else
      mv "$item" app/
    fi
    echo "[capacitor-build] Restored $name"
  fi
done

echo "[capacitor-build] Done! out/ directory ready for Capacitor."
