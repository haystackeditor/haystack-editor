/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { SymbolKind } from "vs/editor/common/languages"

export function isFunctionLikeSymbol(symbolKind: SymbolKind): boolean {
	switch (symbolKind) {
		case SymbolKind.Function:
		case SymbolKind.Method:
		case SymbolKind.Constructor:
			return true
		default:
			return false
	}
}
