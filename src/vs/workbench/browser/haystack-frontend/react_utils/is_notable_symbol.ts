/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { SymbolKind } from "vs/editor/common/languages"

export function isNotableSymbol(symbolKind: SymbolKind): boolean {
  switch (symbolKind) {
    case SymbolKind.Function:
    case SymbolKind.Method:
    case SymbolKind.Constructor:
    case SymbolKind.Class:
    case SymbolKind.Interface:
    case SymbolKind.Module:
    case SymbolKind.Struct:
    case SymbolKind.Enum:
      return true
    default:
      return false
  }
}
