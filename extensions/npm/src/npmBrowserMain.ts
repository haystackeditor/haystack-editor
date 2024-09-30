/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as httpRequest from "request-light"
import * as vscode from "vscode"
import { addJSONProviders } from "./features/jsonContributions"

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  context.subscriptions.push(addJSONProviders(httpRequest.xhr, undefined))
}

export function deactivate(): void {}
