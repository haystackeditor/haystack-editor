#!/bin/sh

ELECTRON_RUN_AS_NODE="1" \
"$HAYSTACK_GIT_EDITOR_NODE" "$HAYSTACK_GIT_EDITOR_MAIN" $HAYSTACK_GIT_EDITOR_EXTRA_ARGS "$@"
