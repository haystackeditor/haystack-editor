/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export const typescript = 'typescript';
export const typescriptreact = 'typescriptreact';
export const javascript = 'javascript';
export const javascriptreact = 'javascriptreact';
export const jsxTags = 'jsx-tags';

export const jsTsLanguageModes = [
	javascript,
	javascriptreact,
	typescript,
	typescriptreact,
];

export function isSupportedLanguageMode(doc: vscode.TextDocument) {
	return vscode.languages.match([typescript, typescriptreact, javascript, javascriptreact], doc) > 0;
}

export function isTypeScriptDocument(doc: vscode.TextDocument) {
	return vscode.languages.match([typescript, typescriptreact], doc) > 0;
}
