/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

declare module "vscode" {
  // https://github.com/microsoft/vscode/issues/166615

  /**
   * Represents the input box in the Source Control viewlet.
   */
  export interface SourceControlInputBox {
    /**
     * The {@link TextDocument text} of the input box.
     */
    readonly document: TextDocument
  }
}
