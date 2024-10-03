/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { DeferredPromise } from "vs/base/common/async"
import { URI } from "vs/base/common/uri"
import { ICodeEditor } from "vs/editor/browser/editorBrowser"
import { IRange } from "vs/editor/common/core/range"
import { DocumentSymbol, SymbolKind } from "vs/editor/common/languages"
import { HaystackReferenceWidget } from "vs/editor/contrib/gotoSymbol/browser/peek/haystackReferencesWidget"
import { ReferencesModel } from "vs/editor/contrib/gotoSymbol/browser/referencesModel"
import {
  IEditorOptions,
  IResourceEditorInput,
} from "vs/platform/editor/common/editor"
import { SymbolDepsType } from "vs/workbench/browser/haystack-frontend/workspace/editors/common"
import { EditorPane } from "vs/workbench/browser/parts/editor/editorPane"
import { IEditorIdentifier, IEditorPane, IResourceMergeEditorInput } from "vs/workbench/common/editor"
import { EditorInput } from "vs/workbench/common/editor/editorInput"
import { NotebookEditor } from "vs/workbench/contrib/notebook/browser/notebookEditor"
import { WebviewEditor } from "vs/workbench/contrib/webviewPanel/browser/webviewEditor"

export type CanvasEditor =
  | CanvasCodeEditor
  | CanvasDiffEditor
  | CanvasGhostEditor
  | CanvasModalEditor
  | CanvasReferencesEditor
  | CanvasCopilotSettingsEditor
  | CanvasHaystackKeybindingsEditor
  | CanvasMergeEditor

export const MIN_EDITOR_WIDTH = 600
export const MIN_EDITOR_HEIGHT = 150
export const DEFAULT_EDITOR_WIDTH = 800
export const DEFAULT_DIFF_EDITOR_WIDTH = 1000
export const EMPTY_EDITOR_HEIGHT = 80
export const DEFAULT_EDITOR_HEIGHT = 800

export const enum CanvasEditorType {
  CODE_EDITOR = 0,
  DIFF_EDITOR = 1,
  GHOST_EDITOR = 2,
  MODAL_EDITOR = 3,
  REFERENCES_EDITOR = 4,
  COPILOT_SETTINGS_EDITOR = 5,
  HAYSTACK_KEYBINDINGS_EDITOR = 6,
  MERGE_EDITOR = 7,
}

export interface Reference {
  filePath: string
  snippet: string
  row: number
  col: number
}

export interface ScrollPosition {
  row: number
  scrollTop: number
}

type BasicCanvasEditor = {
  uuid: string
  // Used for when the editor is unpinned.
  xPosition: number
  yPosition: number
  width: number
  height: number
  // Used for when the editor is pinned.
  vxPosition: number
  vyPosition: number
  vWidth: number
  vHeight: number
  // Other fields.
  isGhost: boolean
  hasResized: boolean
  shouldRespondToCloseEvents: boolean
  isPinned: boolean
}

export type EditorBase = {
  selectionRange: IRange | null
  scrollPosition: number | null
  isDirty: boolean
  isShowingCancellationModal: boolean
  identifier: IEditorIdentifier | null
  highlightRange: IRange | null
  options: IEditorOptions | null
  existingEditorInput: { input: EditorInput; groupId: number } | null
  editorContainer: HTMLElement | null

  zIndex: number
  editRange: IRange | null
  currentSymbol: DocumentSymbol | null
  symbolName: string | null
  symbolType: SymbolKind | null

  deferredPanePromise: DeferredPromise<IEditorPane | undefined> | null
}

export type DiffEditorBase = {
  originalUri: URI
  modifiedUri: URI
}

export type CanvasGhostEditor = BasicCanvasEditor &
  EditorBase & {
    type: CanvasEditorType.GHOST_EDITOR
    uri: URI
    filePath: string
    value: string
    dependencyListType: SymbolDepsType | null
  }

export type CanvasDiffEditor = BasicCanvasEditor &
  EditorBase &
  DiffEditorBase & {
    type: CanvasEditorType.DIFF_EDITOR
    filePath: string
  }

export type CanvasCodeEditor = BasicCanvasEditor &
  EditorBase & {
    filePath: string
    uri: URI
    symbolName: string | null
    symbolType: SymbolKind | null
    type: CanvasEditorType.CODE_EDITOR
    dependencyListType: SymbolDepsType | null
    notebookEditor: NotebookEditor | null
    webviewEditor: WebviewEditor | null
  }

export type CanvasReferencesEditor = BasicCanvasEditor & {
  type: CanvasEditorType.REFERENCES_EDITOR
  referencesModel: ReferencesModel
  referencesWidget: HaystackReferenceWidget | null
  codeEditor: ICodeEditor
  range: IRange
  currentReferenceUri: URI | null
  numberOfReferences: number | null
  isDirty: boolean
  isClosing: boolean
}

export type CanvasModalEditor = BasicCanvasEditor &
  EditorBase & {
    type: CanvasEditorType.MODAL_EDITOR
    input: EditorInput | IResourceEditorInput
    editorPane: EditorPane | null
  }

export type CanvasMergeEditor = BasicCanvasEditor &
  EditorBase & {
    type: CanvasEditorType.MERGE_EDITOR
    input: IResourceMergeEditorInput
    editorPane: EditorPane | null
  }

export type CanvasCopilotSettingsEditor = BasicCanvasEditor & {
  type: CanvasEditorType.COPILOT_SETTINGS_EDITOR
  editorContainer: HTMLElement | null
  zIndex: number
}

export type CanvasHaystackKeybindingsEditor = BasicCanvasEditor & {
  type: CanvasEditorType.HAYSTACK_KEYBINDINGS_EDITOR
  editorContainer: HTMLElement | null
  zIndex: number
}
