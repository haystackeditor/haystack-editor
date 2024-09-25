set -x
cd "$(git rev-parse --show-toplevel)"
rm -r node_modules/pixi.js/dist
cp -r ../pixijs/dist node_modules/pixi.js
cd node_modules/@pixi
find ./ . -name '*.d.ts' -type f -delete
