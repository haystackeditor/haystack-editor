/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ValidDiffEditorBaseOptions } from 'vs/editor/common/config/editorOptions';

export const diffEditorDefaultOptions = {
	enableSplitViewResizing: true,
	splitViewDefaultRatio: 0.5,
	renderSideBySide: true,
	renderMarginRevertIcon: true,
	renderGutterMenu: true,
	maxComputationTime: 5000,
	maxFileSize: 50,
	ignoreTrimWhitespace: true,
	renderIndicators: true,
	originalEditable: false,
	diffCodeLens: false,
	renderOverviewRuler: true,
	diffWordWrap: 'inherit',
	diffAlgorithm: 'advanced',
	accessibilityVerbose: false,
	experimental: {
		showMoves: false,
		showEmptyDecorations: true,
	},
	hideUnchangedRegions: {
		enabled: false,
		contextLineCount: 3,
		minimumLineCount: 3,
		revealLineCount: 20,
	},
	isInEmbeddedEditor: false,
	onlyShowAccessibleDiffViewer: false,
	renderSideBySideInlineBreakpoint: 900,
	useInlineViewWhenSpaceIsLimited: true,
} satisfies ValidDiffEditorBaseOptions;
