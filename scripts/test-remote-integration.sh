#!/usr/bin/env bash
set -e

if [[ "$OSTYPE" == "darwin"* ]]; then
	realpath() { [[ $1 = /* ]] && echo "$1" || echo "$PWD/${1#./}"; }
	ROOT=$(dirname $(dirname $(realpath "$0")))
else
	ROOT=$(dirname $(dirname $(readlink -f $0)))
	# --disable-dev-shm-usage: when run on docker containers where size of /dev/shm
	# partition < 64MB which causes OOM failure for chromium compositor that uses the partition for shared memory
	LINUX_EXTRA_ARGS="--disable-dev-shm-usage"
fi

HAYSTACKUSERDATADIR=`mktemp -d 2>/dev/null`
HAYSTACKCRASHDIR=$ROOT/.build/crashes
HAYSTACKLOGSDIR=$ROOT/.build/logs/integration-tests-remote
TESTRESOLVER_DATA_FOLDER=`mktemp -d 2>/dev/null`

cd $ROOT

if [[ "$1" == "" ]]; then
	AUTHORITY=vscode-remote://test+test
	EXT_PATH=$ROOT/extensions
	# Load remote node
	yarn gulp node
else
	AUTHORITY=$1
	EXT_PATH=$2
	HAYSTACKUSERDATADIR=${3:-$HAYSTACKUSERDATADIR}
fi

export REMOTE_HAYSTACK=$AUTHORITY$EXT_PATH

# Figure out which Electron to use for running tests
if [ -z "$INTEGRATION_TEST_ELECTRON_PATH" ]
then
	INTEGRATION_TEST_ELECTRON_PATH="./scripts/code.sh"

	# No extra arguments when running out of sources
	EXTRA_INTEGRATION_TEST_ARGUMENTS=""

	echo "Running remote integration tests out of sources."
else
	export HAYSTACK_CLI=1
	export ELECTRON_ENABLE_LOGGING=1

	# Running from a build, we need to enable the vscode-test-resolver extension
	EXTRA_INTEGRATION_TEST_ARGUMENTS="--extensions-dir=$EXT_PATH  --enable-proposed-api=vscode.vscode-test-resolver --enable-proposed-api=vscode.vscode-api-tests"

	echo "Running remote integration tests with $INTEGRATION_TEST_ELECTRON_PATH as build."
fi

export TESTRESOLVER_DATA_FOLDER=$TESTRESOLVER_DATA_FOLDER
export TESTRESOLVER_LOGS_FOLDER=$HAYSTACKLOGSDIR/server

# Figure out which remote server to use for running tests
if [ -z "$HAYSTACK_REMOTE_SERVER_PATH" ]
then
	echo "Using remote server out of sources for integration tests"
else
	echo "Using $HAYSTACK_REMOTE_SERVER_PATH as server path for integration tests"
	export TESTRESOLVER_INSTALL_BUILTIN_EXTENSION='ms-vscode.vscode-smoketest-check'
fi

if [ -z "$INTEGRATION_TEST_APP_NAME" ]; then
	kill_app() { true; }
else
	kill_app() { killall $INTEGRATION_TEST_APP_NAME || true; }
fi

API_TESTS_EXTRA_ARGS="--disable-telemetry --skip-welcome --skip-release-notes --crash-reporter-directory=$HAYSTACKCRASHDIR --logsPath=$HAYSTACKLOGSDIR --no-cached-data --disable-updates --use-inmemory-secretstorage --disable-workspace-trust --user-data-dir=$HAYSTACKUSERDATADIR"

echo "Storing crash reports into '$HAYSTACKCRASHDIR'."
echo "Storing log files into '$HAYSTACKLOGSDIR'."


# Tests in the extension host

echo
echo "### API tests (folder)"
echo
"$INTEGRATION_TEST_ELECTRON_PATH" $LINUX_EXTRA_ARGS --folder-uri=$REMOTE_HAYSTACK/vscode-api-tests/testWorkspace --extensionDevelopmentPath=$REMOTE_HAYSTACK/vscode-api-tests --extensionTestsPath=$REMOTE_HAYSTACK/vscode-api-tests/out/singlefolder-tests $API_TESTS_EXTRA_ARGS $EXTRA_INTEGRATION_TEST_ARGUMENTS
kill_app

echo
echo "### API tests (workspace)"
echo
"$INTEGRATION_TEST_ELECTRON_PATH" $LINUX_EXTRA_ARGS --file-uri=$REMOTE_HAYSTACK/vscode-api-tests/testworkspace.code-workspace --extensionDevelopmentPath=$REMOTE_HAYSTACK/vscode-api-tests --extensionTestsPath=$REMOTE_HAYSTACK/vscode-api-tests/out/workspace-tests $API_TESTS_EXTRA_ARGS $EXTRA_INTEGRATION_TEST_ARGUMENTS
kill_app

echo
echo "### TypeScript tests"
echo
"$INTEGRATION_TEST_ELECTRON_PATH" $LINUX_EXTRA_ARGS --folder-uri=$REMOTE_HAYSTACK/typescript-language-features/test-workspace --extensionDevelopmentPath=$REMOTE_HAYSTACK/typescript-language-features --extensionTestsPath=$REMOTE_HAYSTACK/typescript-language-features/out/test/unit $API_TESTS_EXTRA_ARGS $EXTRA_INTEGRATION_TEST_ARGUMENTS
kill_app

echo
echo "### Markdown tests"
echo
"$INTEGRATION_TEST_ELECTRON_PATH" $LINUX_EXTRA_ARGS --folder-uri=$REMOTE_HAYSTACK/markdown-language-features/test-workspace --extensionDevelopmentPath=$REMOTE_HAYSTACK/markdown-language-features --extensionTestsPath=$REMOTE_HAYSTACK/markdown-language-features/out/test $API_TESTS_EXTRA_ARGS $EXTRA_INTEGRATION_TEST_ARGUMENTS
kill_app

echo
echo "### Emmet tests"
echo
"$INTEGRATION_TEST_ELECTRON_PATH" $LINUX_EXTRA_ARGS --folder-uri=$REMOTE_HAYSTACK/emmet/test-workspace --extensionDevelopmentPath=$REMOTE_HAYSTACK/emmet --extensionTestsPath=$REMOTE_HAYSTACK/emmet/out/test $API_TESTS_EXTRA_ARGS $EXTRA_INTEGRATION_TEST_ARGUMENTS
kill_app

echo
echo "### Git tests"
echo
"$INTEGRATION_TEST_ELECTRON_PATH" $LINUX_EXTRA_ARGS --folder-uri=$AUTHORITY$(mktemp -d 2>/dev/null) --extensionDevelopmentPath=$REMOTE_HAYSTACK/git --extensionTestsPath=$REMOTE_HAYSTACK/git/out/test $API_TESTS_EXTRA_ARGS $EXTRA_INTEGRATION_TEST_ARGUMENTS
kill_app

echo
echo "### Ipynb tests"
echo
"$INTEGRATION_TEST_ELECTRON_PATH" $LINUX_EXTRA_ARGS --folder-uri=$AUTHORITY$(mktemp -d 2>/dev/null) --extensionDevelopmentPath=$REMOTE_HAYSTACK/ipynb --extensionTestsPath=$REMOTE_HAYSTACK/ipynb/out/test $API_TESTS_EXTRA_ARGS $EXTRA_INTEGRATION_TEST_ARGUMENTS
kill_app

echo
echo "### Configuration editing tests"
echo
"$INTEGRATION_TEST_ELECTRON_PATH" $LINUX_EXTRA_ARGS --folder-uri=$AUTHORITY$(mktemp -d 2>/dev/null) --extensionDevelopmentPath=$REMOTE_HAYSTACK/configuration-editing --extensionTestsPath=$REMOTE_HAYSTACK/configuration-editing/out/test $API_TESTS_EXTRA_ARGS $EXTRA_INTEGRATION_TEST_ARGUMENTS
kill_app

# Cleanup

if [[ "$3" == "" ]]; then
	rm -rf $HAYSTACKUSERDATADIR
fi

rm -rf $TESTRESOLVER_DATA_FOLDER
