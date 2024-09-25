# ---------------------------------------------------------------------------------------------
#   Copyright (c) Microsoft Corporation. All rights reserved.
#   Licensed under the MIT License. See code-license.txt in the project root for license information.
# ---------------------------------------------------------------------------------------------
if [[ $options[norcs] = off && -o "login" &&  -f $USER_ZDOTDIR/.zprofile ]]; then
	HAYSTACK_ZDOTDIR=$ZDOTDIR
	ZDOTDIR=$USER_ZDOTDIR
	. $USER_ZDOTDIR/.zprofile
	ZDOTDIR=$HAYSTACK_ZDOTDIR

	# Apply any explicit path prefix (see #99878)
	if (( ${+HAYSTACK_PATH_PREFIX} )); then
		export PATH=$HAYSTACK_PATH_PREFIX$PATH
	fi
	builtin unset HAYSTACK_PATH_PREFIX
fi
