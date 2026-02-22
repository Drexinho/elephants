#!/usr/bin/env bash
# Publikuje release: stáhne main, vybuildí, nahraje do větve release.
# Na produkčním serveru pak stačí: git pull origin release

set -e
cd "$(dirname "$0")/.."
REPO_ROOT=$(pwd)

echo "==> Fetch a pull main..."
git fetch origin
git checkout main
git pull origin main

echo "==> Build..."
npm ci
npm run build

echo "==> Uložení dist a public/videos..."
cp -r dist /tmp/elephants-release-dist
cp -r public/videos /tmp/elephants-release-videos 2>/dev/null || true

echo "==> Přepnutí na release a aktualizace souborů..."
git checkout release
git checkout main -- index.php .htaccess .env.example 2>/dev/null || true
git checkout main -- php/ 2>/dev/null || true
rm -f server.js db.js auth.js login-limiter.js 2>/dev/null || true
rm -rf dist
cp -r /tmp/elephants-release-dist dist
rm -rf public/videos
mkdir -p public
cp -r /tmp/elephants-release-videos public/videos 2>/dev/null || true
rm -rf /tmp/elephants-release-dist /tmp/elephants-release-videos

echo "==> Commit a push release..."
git add dist index.php .htaccess php .env.example public/videos 2>/dev/null || true
git add -u
if git diff --staged --quiet; then
  echo "Žádné změny oproti předchozímu release."
else
  git commit -m "Release: aktualizace buildu a PHP backendu"
  git push origin release
fi

git checkout main
echo "==> Hotovo. Na serveru spusť: git pull origin release"
echo ""
