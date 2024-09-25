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

export interface PackageInfo {
  name: string
  version: string
  aiKey: string
}

export function getPackageInfo(context: vscode.ExtensionContext) {
  const packageJSON = context.extension.packageJSON
  if (packageJSON && typeof packageJSON === "object") {
    return {
      name: packageJSON.name ?? "",
      version: packageJSON.version ?? "",
      aiKey: packageJSON.aiKey ?? "",
    }
  }
  return null
}
