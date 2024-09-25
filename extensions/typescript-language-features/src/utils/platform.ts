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

export function isWeb(): boolean {
  return "navigator" in globalThis && vscode.env.uiKind === vscode.UIKind.Web
}

export function isWebAndHasSharedArrayBuffers(): boolean {
  return isWeb() && (globalThis as any)["crossOriginIsolated"]
}

export function supportsReadableByteStreams(): boolean {
  return isWeb() && "ReadableByteStreamController" in globalThis
}
