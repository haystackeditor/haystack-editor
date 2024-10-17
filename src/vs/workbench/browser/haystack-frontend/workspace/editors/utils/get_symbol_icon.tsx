/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { FileSvg } from "vs/workbench/browser/haystack-frontend/design_components/floating_toolbar_icons"
import {
  ClassSvg,
  FunctionSvg,
  VariableSvg,
} from "vs/workbench/browser/haystack-frontend/workspace/editors/svgs"
import * as React from "react"
import { SymbolKind } from "vs/editor/common/languages"

export function getSymbolIcon(
  type: SymbolKind,
  options?: {
    width?: number
    height?: number
    darkMode?: boolean
  }
) {
  switch (type) {
    case SymbolKind.File:
      return <FileSvg width={options?.width} height={options?.height} />
    case SymbolKind.Method:
    case SymbolKind.Function:
      return (
        <FunctionSvg
          width={options?.width}
          height={options?.height}
          darkMode={options?.darkMode}
        />
      )
    case SymbolKind.Class:
    case SymbolKind.Interface:
    case SymbolKind.Enum:
    case SymbolKind.Struct:
    case SymbolKind.Module:
      return (
        <ClassSvg
          width={options?.width}
          height={options?.height}
          darkMode={options?.darkMode}
        />
      )
    default:
      return (
        <VariableSvg
          width={options?.width}
          height={options?.height}
          darkMode={options?.darkMode}
        />
      )
  }
}
