/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from "vs/base/common/uri"
import { IRange } from "vs/editor/common/core/range"
import { SymbolKind } from "vs/editor/common/languages"
import { ITextModel } from "vs/editor/common/model"

export const MIN_CANVAS_SCALE = 0.2
export const MAX_CANVAS_SCALE = 2

export interface EditorOpenResult {}

export interface OpenAiSettings {
  apiKey: string | null
  organizationid: string | null
  endpoint: string | null
}

export const enum SymbolDepsType {
  NONE = 0,
  INCOMING = 1,
  OUTGOING = 2,
}

export interface SymbolDepMetadata {
  snippet: string
  callRange: IRange
  fromRanges: IRange[]
}

export interface SymbolDep {
  identifier: string
  filePath: string
  uri: URI
  metadata: SymbolDepMetadata[]
  symbolType?: SymbolKind
  range?: IRange
}

export const enum NavigationType {
  JUST_ENOUGH = 0,
  CENTER = 1,
}

export function getMaxColumn(model: ITextModel, editRange?: IRange) {
  let maxColumn = 0

  for (
    let line = editRange ? editRange.startLineNumber : 1;
    line <= (editRange ? editRange.endLineNumber : model.getLineCount());
    ++line
  ) {
    const trimmedLine = model.getLineContent(line).trim()
    if (
      trimmedLine.startsWith("import") ||
      lineIsComment(trimmedLine) ||
      trimmedLine.includes("//")
    ) {
      continue
    }
    maxColumn = Math.max(maxColumn, model.getLineMaxColumn(line))
  }

  return maxColumn
}

export function lineIsComment(line: string) {
  return (
    line.startsWith("//") ||
    line.startsWith("#") ||
    line.startsWith("/*") ||
    line.startsWith("*") ||
    line.startsWith("*/") ||
    line.startsWith("<!--") ||
    line.startsWith("-->") ||
    line.startsWith("<!---") ||
    line.startsWith("--->")
  )
}

export const INCOMING_DEPS_KEY = "incoming"
export const OUTGOING_DEPS_KEY = "outgoing"
