/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { SymbolKind } from "vs/editor/common/languages"

export function getSymbolHeaderClassName(type: SymbolKind | undefined) {
  if (type == null) return "fileSymbol"

  switch (type) {
    case SymbolKind.File:
      return "fileSymbol"
    case SymbolKind.Method:
    case SymbolKind.Function:
      return "functionSymbol"
    case SymbolKind.Class:
    case SymbolKind.Interface:
    case SymbolKind.Enum:
    case SymbolKind.Struct:
    case SymbolKind.Module:
      return "classSymbol"
    default:
      return "variableSymbol"
  }
}
