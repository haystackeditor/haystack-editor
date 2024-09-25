# I run this using the `sh` provided by git on my windows machine
# TODO: create a .bat version of this

set -ex
cd "$(git rev-parse --show-toplevel)"
yarn
./build-scripts/edit-npm-modules.sh

node --max-old-space-size=8192 ./node_modules/gulp/bin/gulp.js vscode-win32-x64-min

# Sometimes this will fail after a while in the final step (due to a memory leak?)
# In that case run:
# rm -r node_modules/onnxruntime-node
# rm -r node_modules/@aws-sdk
# node --max-old-space-size=8192 ./node_modules/gulp/bin/gulp.js vscode-win32-x64-ci
# ^The -ci at the end is important as it will make sure that it only re-runs the final step
