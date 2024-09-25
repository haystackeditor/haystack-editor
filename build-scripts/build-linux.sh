set -ex
cd "$(git rev-parse --show-toplevel)"
yarn
./build-scripts/edit-npm-modules.sh
node --max-old-space-size=8192 ./node_modules/gulp/bin/gulp.js vscode-linux-x64-min
