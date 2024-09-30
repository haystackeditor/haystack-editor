/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode"

/**
 * Minimal version of {@link vscode.TextDocument}.
 */
export interface ITextDocument {
  readonly uri: vscode.Uri
  readonly version: number

  getText(range?: vscode.Range): string

  positionAt(offset: number): vscode.Position
}
