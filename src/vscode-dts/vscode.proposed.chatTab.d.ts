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
  /**
   * The tab represents an interactive window.
   */
  export class TabInputChat {
    constructor()
  }

  export interface Tab {
    readonly input:
      | TabInputText
      | TabInputTextDiff
      | TabInputCustom
      | TabInputWebview
      | TabInputNotebook
      | TabInputNotebookDiff
      | TabInputTerminal
      | TabInputChat
      | unknown
  }
}
