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
  // TODO@rebornix: add github issue link

  export interface NotebookDocumentContentOptions {
    /**
     * Controls if a cell metadata property should be reverted when the cell content
     * is reverted in notebook diff editor.
     */
    cellContentMetadata?: { [key: string]: boolean | undefined }
  }
}
