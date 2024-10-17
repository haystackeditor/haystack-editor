/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAutoClosingPair } from 'vs/editor/common/languages/languageConfiguration';

export const latexAutoClosingPairsRules: IAutoClosingPair[] = [
	{ open: '\\left(', close: '\\right)' },
	{ open: '\\left[', close: '\\right]' },
	{ open: '\\left\\{', close: '\\right\\}' },
	{ open: '\\bigl(', close: '\\bigr)' },
	{ open: '\\bigl[', close: '\\bigr]' },
	{ open: '\\bigl\\{', close: '\\bigr\\}' },
	{ open: '\\Bigl(', close: '\\Bigr)' },
	{ open: '\\Bigl[', close: '\\Bigr]' },
	{ open: '\\Bigl\\{', close: '\\Bigr\\}' },
	{ open: '\\biggl(', close: '\\biggr)' },
	{ open: '\\biggl[', close: '\\biggr]' },
	{ open: '\\biggl\\{', close: '\\biggr\\}' },
	{ open: '\\Biggl(', close: '\\Biggr)' },
	{ open: '\\Biggl[', close: '\\Biggr]' },
	{ open: '\\Biggl\\{', close: '\\Biggr\\}' },
	{ open: '\\(', close: '\\)' },
	{ open: '\\[', close: '\\]' },
	{ open: '\\{', close: '\\}' },
	{ open: '{', close: '}' },
	{ open: '[', close: ']' },
	{ open: '(', close: ')' },
	{ open: '`', close: '\'' },
];
