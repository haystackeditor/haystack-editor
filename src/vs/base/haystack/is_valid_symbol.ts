import { DocumentSymbol, SymbolKind } from "vs/editor/common/languages"

export function isValidSymbol(symbol: DocumentSymbol): boolean {
  switch (symbol.kind) {
    case SymbolKind.Variable:
    case SymbolKind.Constant:
    case SymbolKind.Array:
    case SymbolKind.Boolean:
    case SymbolKind.TypeParameter:
    case SymbolKind.String:
    case SymbolKind.EnumMember:
    case SymbolKind.Field:
    case SymbolKind.Null:
    case SymbolKind.Key:
    case SymbolKind.Property:
    case SymbolKind.Object:
    case SymbolKind.Number:
    case SymbolKind.Key:
      return (symbol.children?.length ?? 0) > 0
    default:
      return true
  }
}
