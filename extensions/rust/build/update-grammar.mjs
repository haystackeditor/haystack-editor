/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
//@ts-check

import * as vscodeGrammarUpdater from "vscode-grammar-updater"

vscodeGrammarUpdater.update(
  "dustypomerleau/rust-syntax",
  "syntaxes/rust.tmLanguage.json",
  "./syntaxes/rust.tmLanguage.json",
  undefined,
  "main",
)
