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
  // https://github.com/microsoft/vscode/issues/91555

  export enum StandardTokenType {
    Other = 0,
    Comment = 1,
    String = 2,
    RegEx = 3,
  }

  export interface TokenInformation {
    type: StandardTokenType
    range: Range
  }

  export namespace languages {
    /** @deprecated */
    export function getTokenInformationAtPosition(
      document: TextDocument,
      position: Position,
    ): Thenable<TokenInformation>
  }
}
