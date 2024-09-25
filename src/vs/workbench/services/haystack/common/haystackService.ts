/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from "vs/platform/instantiation/common/instantiation"
import {
  IResourceEditorInput,
  IEditorOptions,
} from "vs/platform/editor/common/editor"
import {
  IEditorPane,
  GroupIdentifier,
  IEditorIdentifier,
  ISaveOptions,
  IRevertOptions,
  IUntypedEditorInput,
} from "vs/workbench/common/editor"
import { EditorInput } from "vs/workbench/common/editor/editorInput"
import { URI } from "vs/base/common/uri"
import { IGroupModelChangeEvent } from "vs/workbench/common/editor/editorGroupModel"
import { IRange, Range } from "vs/editor/common/core/range"
import {
  DocumentSymbol,
  Location,
  LocationLink,
  SymbolKind,
} from "vs/editor/common/languages"
import { ICodeEditor } from "vs/editor/browser/editorBrowser"
import { ITextModel } from "vs/editor/common/model"
import { ReferencesModel } from "vs/editor/contrib/gotoSymbol/browser/referencesModel"
import { IReference } from "vs/base/common/lifecycle"
import { ITextFileEditorModel } from "vs/workbench/services/textfile/common/textfiles"
import { lineIsComment } from "vs/workbench/browser/haystack-frontend/workspace/editors/common"
import { CodeWindow } from "vs/base/browser/window"
import { DeferredPromise } from "vs/base/common/async"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { CanvasCodeEditor } from "vs/workbench/browser/haystack-frontend/editor/editor"

export const IHaystackService =
  createDecorator<IHaystackService>("haystackService")

export interface LocationMetadata {
  identifier: string
  filePath: string
  uri: URI
  snippet: string
  range: IRange
  enclosingSymbol?: DocumentSymbol
}

export interface SymbolResult {
  symbol: DocumentSymbol | null
  codeEditor: ICodeEditor
}

export interface SortSymbolData {
  range?: IRange
  uri: URI
  identifier: IEditorIdentifier
  editorId: string
}

export interface DependencyArrow {
  from: Vector
  to: Vector
  symmetrical: boolean
  color: number
  dependencyArrowType: DependencyArrowType
}

export const enum DependencyArrowType {
  // One symbol editor contains a dependency on another
  SYMBOL_DEPENDENCY = 0,
  // Editors are in the same.
  SAME_FILE = 1,
}

export type SymbolRelationship =
  | SymbolToSymbolRelationship
  | SymbolToFileRelationship

export type SymbolToSymbolRelationship = {
  relationshipType: DependencyArrowType.SYMBOL_DEPENDENCY
  fromLocationRange: IRange
  fromEditorId: string
  toEditorId: string
}

export type SymbolToFileRelationship = {
  relationshipType: DependencyArrowType.SAME_FILE
  fromEditorId: string
  toEditorId: string
}

export interface ISaveEditorsOptions extends ISaveOptions {
  /**
   * If true, will ask for a location of the editor to save to.
   */
  readonly saveAs?: boolean
}

export interface ISaveEditorsResult {
  /**
   * Whether the save operation was successful.
   */
  readonly success: boolean

  /**
   * Resulting editors after the save operation.
   */
  readonly editors: Array<EditorInput | IUntypedEditorInput>
}

export interface IUntypedEditorReplacement {
  /**
   * The editor to replace.
   */
  readonly editor: EditorInput

  /**
   * The replacement for the editor.
   */
  readonly replacement: IUntypedEditorInput

  /**
   * Skips asking the user for confirmation and doesn't
   * save the document. Only use this if you really need to!
   */
  forceReplaceDirty?: boolean
}

export interface IBaseSaveRevertAllEditorOptions {
  /**
   * Whether to include untitled editors as well.
   */
  readonly includeUntitled?:
    | {
        /**
         * Whether to include scratchpad editors.
         * Scratchpads are not included if not specified.
         */
        readonly includeScratchpad: boolean
      }
    | boolean

  /**
   * Whether to exclude sticky editors.
   */
  readonly excludeSticky?: boolean
}

export interface ISaveAllEditorsOptions
  extends ISaveEditorsOptions,
    IBaseSaveRevertAllEditorOptions {}

export interface IRevertAllEditorsOptions
  extends IRevertOptions,
    IBaseSaveRevertAllEditorOptions {}

export interface IOpenEditorsOptions {
  /**
   * Whether to validate trust when opening editors
   * that are potentially not inside the workspace.
   */
  readonly validateTrust?: boolean
}

export interface IEditorsChangeEvent {
  /**
   * The group which had the editor change
   */
  groupId: GroupIdentifier
  /*
   * The event fired from the model
   */
  event: IGroupModelChangeEvent
}

export interface ExistingEditorArgs {
  input: EditorInput
  groupId: number
}

export interface EditorOpenArgs {
  selectionRange?: IRange
  highlightRange?: IRange
  existingEditorInput?: ExistingEditorArgs
  replaceExistingEditorInput?: ExistingEditorArgs
  scrollPosition?: number
  languageId?: string
  forceNewEditor?: boolean
  doNotPanTo?: boolean
  unconditionallyAddDependencyRange?: IRange
}

export interface LineMetadata {
  numLines: number
  longestLineColumn: number
}

export interface IHaystackService {
  readonly _serviceBrand: undefined

  createFileEditor(
    uri: URI | undefined,
    args?: EditorOpenArgs,
    options?: IEditorOptions,
  ): Promise<IEditorPane | undefined>

  createSymbolEditorWithSymbol(
    name: string,
    symbolType: SymbolKind,
    uri: URI,
    range: IRange,
    args?: EditorOpenArgs,
    options?: IEditorOptions,
  ): Promise<IEditorPane | undefined>
  createReferenceEditor(
    referencesModel: ReferencesModel,
    codeEditor: ICodeEditor,
    range: IRange,
  ): void
  createFileDiffEditor(
    originalUri: URI,
    modifiedUri: URI,
    args?: EditorOpenArgs,
  ): Promise<IEditorPane | undefined>

  createEditorElement(
    uri: URI,
    domElement: HTMLElement,
    deferredEditorPanePromise: DeferredPromise<IEditorPane | undefined>,
    canvasCodeEditor?: CanvasCodeEditor,
    options?: IEditorOptions,
    args?: EditorOpenArgs,
  ): Promise<IEditorIdentifier | null>

  createSymbolEditorWithPosition(
    name: string,
    symbolType: SymbolKind,
    uri: URI,
    range: IRange,
  ): Promise<void>

  createModalEditor(
    input: EditorInput | IResourceEditorInput,
    args?: EditorOpenArgs,
    options?: IEditorOptions,
  ): Promise<IEditorPane | undefined>

  resetZoomLevel(): void

  deleteEditor(editorId: string): void

  setCurrentReference(
    editorId: string,
    uri: URI,
    numberOfReferences?: number,
  ): void

  getOrCreateTextModelRef(
    uri: URI,
  ): Promise<IReference<ITextFileEditorModel> | null>

  getDeepestSymbolContainingRange(
    location: Location,
  ): Promise<DocumentSymbol | null>

  getSymbolAtPosition(
    locationLinks: LocationLink,
  ): Promise<DocumentSymbol | null>

  getFocusedCodeEditor(): ICodeEditor | null

  getTransformInfoForEditor(editor: EditorInput): {
    xPosition: number
    yPosition: number
    width: number
    height: number
  } | null

  getIsGhostEditor(editor: EditorInput): boolean

  getContainer(window: CodeWindow): HTMLElement | null

  removeCanvasDots(): void

  addCanvasDots(): void

  createCopilotSettingsEditor(): Promise<void>

  createHaystackKeybindingsEditor(): Promise<void>

  focusOnEditorContainer(): void

  focusOnCanvas(): void

  goBackInEditorHistory(): void

  goForwardInEditorHistory(): void

  goBackInSelection(): void

  goForwardInSelection(): void

  goDownOneLevelInEditor(): void

  goUpOneLevelInEditor(): void

  goToFile(): void

  goToDeepestSymbol(): void

  viewIncomingDependencies(): void

  viewOutgoingDependencies(): void

  pinCurrentEditor(): void

  unpinCurrentEditor(): void

  focusOnEditorWithWebview(origin: string): void

  blurEditorWithWebview(origin: string): void

  panToEditorWithIdentifier(editor: EditorInput, groupId: number): void

  forwardPointerEvent(e: PointerEvent): void

  getCopilotOptOut(): boolean
}

export function adjustRangeForComments(
  range: IRange,
  model: ITextModel,
): IRange {
  let adjustableRange = Range.fromIRange(range)
  let line = model.getLineContent(range.startLineNumber).trim()

  // While the line is a comment, just keep moving the range down.
  while (line.length === 0 || lineIsComment(line)) {
    adjustableRange = new Range(
      adjustableRange.startLineNumber + 1,
      1,
      adjustableRange.startLineNumber + 1,
      1,
    )
    if (adjustableRange.startLineNumber > model.getLineCount()) {
      return Range.toIRange(adjustableRange.delta(-1))
    }
    line = model.getLineContent(adjustableRange.startLineNumber).trim()
  }

  return Range.toIRange(adjustableRange)
}
